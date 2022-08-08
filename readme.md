# cdn-fc-plugin
本插件帮助您通过[Serverless-Devs](https://github.com/Serverless-Devs/Serverless-Devs)工具和[CDN组件](https://github.com/devsapp/cdn)，实现对FC函数进行CDN加速。
<a name="QxIZy"></a>
## 快速开始

- [源码](https://github.com/devsapp/start-cdn/start-fc-cdn/)
- 快速体验: `s init start-fc-cdn`
  <a name="XbkA9"></a>
## 插件使用
`cdn-fc-plugin`本质是针对[CDN组件](https://github.com/devsapp/cdn)进行增强。
还是遵循FC组件的[Yaml规范](https://serverless-devs.com/fc/yaml/readme)，区别在于
1. 在执行部署之前声明对应的插件`cdn-fc-plugin`
```yaml
cdn-service: # cdn 相关配置
  component: devsapp/cdn  # 组件名称
  actions: # 自定义执行逻辑
    pre-deploy: # 在deploy之前运行
      - plugin: cdn-fc-plugin
        args:
          serviceName: ${vars.serviceName}
          functionName: ${vars.functionName}
          region: ${vars.region}
  props: #  组件的属性值
    cdnType: web
    domainName: ${vars.domainName}
```
<a name="fbNtU"></a>
### 插件参数说明
插件参数详情：

| 参数名称 | 参数含义 | 必填 |
| --- | --- | --- |
| serviceName | 函数计算服务名 | true |
| functionName | 函数计算函数名 | true |
| region | 函数计算部署地域 | true |

<a name="dSXFD"></a>
## 配合website-fc使用案例

- 项目目录结构
```
- dist # 存放静态文件路径
  - index.htm
- s.yaml
```
```yaml
edition: 1.0.0          #  命令行YAML规范版本，遵循语义化版本（Semantic Versioning）规范
name: start-fc-cdn       #  项目名称
access: aliyun-release  #  秘钥别名
vars: # 全局变量
  region: cn-shenzhen
  serviceName: vue-service
  functionName: start-vue3
  domainName: xxx.xyz
  refreshAfterDeploy: true

services:
  website:
    component: fc
    actions: # 自定义执行逻辑
      pre-deploy: # 在deploy之前运行
        - plugin: website-fc
    props: #  组件的属性值
      region: ${vars.region}
      service: ${vars.serviceName}
      function:
        name: ${vars.functionName}
        description: 'hello world by serverless devs'
        runtime: nodejs14   # 任何一个 runtime 都可以
        codeUri: ./dist
        memorySize: 128
        timeout: 60
      triggers:
        - name: httpTrigger
          type: http
          config:
            authType: anonymous
            methods:
              - GET
      customDomains:
        - domainName: auto
          protocol: HTTP
          routeConfigs:
            - path: /*
              methods:
                - GET
  cdn-service: # cdn 相关配置
    component: devsapp/cdn  # 组件名称
    actions: # 自定义执行逻辑
      pre-deploy: # 在deploy之前运行
        - plugin: cdn-fc-plugin
          args:
            serviceName: ${vars.serviceName}
            functionName: ${vars.functionName}
            region: ${vars.region}
    props: #  组件的属性值
      cdnType: web
      domainName: ${vars.domainName}
      refreshConfig:
        objectPaths:
          - http://${vars.domainName}/
        objectType: File
      refreshAfterDeploy: ${vars.refreshAfterDeploy}


```
### 源设置规则
+ 自定义域名的路由规则中存在一条路由的服务名，函数名与目标服务名和函数名相同且路由路径为`/*`直接设置为主源
+ 当自定义域名的路由规则的所有服务名都为目标服务名时，也可作为源，默认为备源，如所有源都为备源时，最新的一个源会改为主源
+ 权重按自定义域名由新到旧排序，新的自定义域名权重越大
