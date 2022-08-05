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
    let listCustomDomainsRequest = new ListCustomDomainsRequest({prefix: `${functionName}.${serviceName}`, limit: 1});

    const customDomains = (await client.listCustomDomains(listCustomDomainsRequest)).body.customDomains;

    if (lodash.isEmpty(customDomains)) {
        throw new CatchableError(`cannot find the service<${serviceName}> function <${functionName}> 's domainName `);
    }

    const customDomain = customDomains[0];

    const domainName = customDomain.domainName;
    if (lodash.isEmpty(domainName)) {
        throw new CatchableError(`cannot find the service<${serviceName}> function <${functionName}> 's domainName `);
    }

    SPINNER_VM.info(`get service<${serviceName}> function <${functionName}> 's domainName<${domainName}> successed!`)

    SPINNER_VM.stop();

    return lodash.merge(inputs, {
        props: {
            sources: [
                {
                    type: 'fc_domain',
                    content: domainName
                }
            ]
        },
    });
};
