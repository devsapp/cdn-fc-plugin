const {CatchableError, lodash, fse, rimraf, getCredential, spinner, Logger} = require("@serverless-devs/core");
const logger = new Logger("cdn-fc-plugin");
const {ListCustomDomainsRequest} = require('@alicloud/fc-open20210406')
const FC_Open20210406 = require('@alicloud/fc-open20210406').default;
const Config = require('@alicloud/openapi-client').Config;
/**
 * Plugin 插件入口
 * @param inputs 组件的入口参数
 * @param args 插件的自定义参数
 * @return inputs
 */

module.exports = async function index(inputs, args) {
    const SPINNER_VM = spinner('cdn-fc-plugin start')

    const {serviceName, functionName, region} = args;

    SPINNER_VM.start('cdn-fc-plugin working!')


    if (lodash.isEmpty(serviceName)) {
        throw new CatchableError(`plugin cdn-fc-plugin's args : serviceName is required!`)
    }

    if (lodash.isEmpty(functionName)) {
        throw new CatchableError(`plugin cdn-fc-plugin's args : serviceName is required!`)
    }
    let credentials = inputs.credentials;
    if (lodash.isEmpty(credentials)) {
        inputs.credentials = await getCredential(inputs.project.access);
        credentials = inputs.credentials;
    }
    let config = new Config({
        accessKeyId: credentials.AccessKeyID,
        accessKeySecret: credentials.AccessKeySecret,
        securityToken: credentials.SecurityToken,
    });
    // 访问的域名
    config.endpoint = `${credentials.AccountID}.${region}.fc.aliyuncs.com`;

    const client = new FC_Open20210406(config);
    let listCustomDomainsRequest = new ListCustomDomainsRequest({limit: 100});

    const domains = [];
    let newNextToken = '';
    do {
        listCustomDomainsRequest.nextToken = newNextToken;
        const {customDomains, nextToken} = (await client.listCustomDomains(listCustomDomainsRequest)).body;
        newNextToken = nextToken;
        if (lodash.isEmpty(customDomains)) {
            break;
        }
        customDomains.forEach(i => {
            const routeConfig = i.routeConfig;
            if (!lodash.isEmpty(routeConfig) && !lodash.isEmpty(routeConfig.routes)) {
                const routes = routeConfig.routes;
                let hasOther = false;
                for (let j = 0; j < routes.length; j++) {
                    const route = routes[j];
                    const rServiceName = route.serviceName;
                    const rFunctionName = route.functionName;
                    if (rServiceName == serviceName) {
                        if (rFunctionName == functionName && route.path == "/*") {
                            domains.push({
                                path: '/*',
                                domainName: i.domainName
                            });
                            break;
                        }

                        // 如果该自定义域名都属于目标Service，也符合条件
                        if (!hasOther && j == routes.length -1) {
                            domains.push({
                                path: 'other',
                                domainName: i.domainName
                            });
                        }
                    } else {
                        hasOther = true;
                    }
                }


            }
        })
    } while (newNextToken);


    if (domains.length <= 0) {
        throw new CatchableError(`cannot find the service<${serviceName}> function <${functionName}> 's domainName `);
    }


    let sources = [];

    // 如果只有只有一个自定义域名匹配，直接设置为主源
    if (domains.length == 1) {
        const domain = domains[0];
        sources.push({
            type: 'fc_domain',
            content: domain.domainName,
            priority: 20,
            weight: 100
        });
    } else {
        let mainWeight = 100;
        let otherWeight = 100;
        let mainCounter = 0;
        sources = domains.map((value, index) => {
            // path为'/*' 的为主源
            if (value.path == "/*") {
                // 权重最小值为10
                const weight = mainWeight == 10 ? 10 : mainWeight--;
                mainCounter++;
                return {
                    type: 'fc_domain',
                    content: value.domainName,
                    priority: 20,
                    weight
                };
            } else {
                // 权重最小值为10
                const weight = otherWeight == 10 ? 10 : otherWeight--;

                return {
                    type: 'fc_domain',
                    content: value.domainName,
                    priority: 30,
                    weight
                };
            }
        });

        // 如果/*作为主源，则将第一备源改为主源
        if (mainCounter == 0) {
            sources[0].priority = 20;
        }
    }
    SPINNER_VM.info(`get service<${serviceName}> function <${functionName}> 's domainNames:\n${sources.map(i => i.content + " : " + (i.priority == 20 ? "主源" : "备源")).join('\n')}`)

    SPINNER_VM.stop();

    return lodash.merge(inputs, {
        props: {
            sources
        },
    });
};
