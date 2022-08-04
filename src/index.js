const core = require("@serverless-devs/core");
const { CatchableError, lodash, fse, rimraf, getCredential, spinner, Logger } = core;
const logger = new Logger("cdn-fc-plugin");
const  fc = require('@alicloud/fc-open20210406')
const FC_Open20210406 = fc.default;
const ListCustomDomainsRequest = fc.ListCustomDomainsRequest;
const Config = require('@alicloud/openapi-client').Config;
const SPINNER_VM = spinner('start action')
/**
 * Plugin 插件入口
 * @param inputs 组件的入口参数
 * @param args 插件的自定义参数
 * @return inputs
 */

module.exports = async function index(inputs, args) {
    const serviceName = args.serviceName;
    const functionName = args.functionName;

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
    config.endpoint = `1656564022886445.cn-shenzhen.fc.aliyuncs.com`;

    const client = new FC_Open20210406(config);
    let listCustomDomainsRequest = new ListCustomDomainsRequest({ prefix: `${functionName}.${serviceName}`,  limit: 1});

    const customDomains = (await client.listCustomDomains(listCustomDomainsRequest)).body.customDomains;

    if (lodash.isEmpty(customDomains)) {
        throw new CatchableError(`cannot find the service<${serviceName}> function <${functionName}> 's domainName `);
    }

    const domainName = customDomains[0].domainName;
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
