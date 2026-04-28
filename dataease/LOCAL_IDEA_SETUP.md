# DataEase IDEA 本地启动说明

## 1. 本地环境

- JDK: `21`
- Maven: `3.9.x` 更稳，IDEA 里直接用 Bundled Maven 也可以
- Node.js: 建议 `23.11.x`
- npm: 建议 `10.9.x`
- MySQL: `8.4.x`
- Redis: `7.x`

当前本地已准备好的服务：

- MySQL: `127.0.0.1:3306`
  - database: `dataease10`
  - username: `root`
  - password: `123456`
- Redis: `127.0.0.1:6379`
  - password: `123456`

## 2. 已准备好的本地配置

为了避免源码启动时直接写入系统 `/opt/dataease2.0`，仓库里已经准备好了两份本地配置：

- Home 配置: [tmp/dataease-local/home/opt/dataease2.0/config/application.yml](/Users/chenliyong/AI/github/StarBI/tmp/dataease-local/home/opt/dataease2.0/config/application.yml)
- Spring 覆盖配置: [tmp/dataease-local/spring/application.yml](/Users/chenliyong/AI/github/StarBI/tmp/dataease-local/spring/application.yml)

配合 IDEA 运行参数后，日志、缓存、静态资源、导出目录都会落到仓库内的 `tmp/dataease-local`。

## 3. IDEA 导入方式

在 IDEA 中直接以 Maven 项目打开：

- 根 `pom`: [dataease/pom.xml](/Users/chenliyong/AI/github/StarBI/dataease/pom.xml)

推荐设置：

- Project SDK: `JDK 21`
- Project language level: `21`
- Maven: `Bundled (Maven 3.9+)`，或者本机已安装的 `3.9.14`
- Node interpreter: 本机 Node，最好切到 `23.11.x`
- 如果看不到 `core-backend` 模块，先在 Maven 面板执行一次 `Reload All Maven Projects`

Maven 额外注意：

- 本机 `mvn` 已安装成功：`3.9.14`
- 但 Homebrew 版 `mvn` 默认会把 `JAVA_HOME` 指向 `openjdk 25`
- `dataease` 需要 `JDK 21`，所以 IDEA 里请把 `Build Tools -> Maven -> JDK for importer/runner` 显式设成 `ms-21`
- 如果你在终端里跑 Maven，建议这样执行：

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -v
```

仓库根目录已经补好了共享运行配置：

- [DataEase Backend.run.xml](/Users/chenliyong/AI/github/StarBI/.run/DataEase%20Backend.run.xml)
- [DataEase Frontend.run.xml](/Users/chenliyong/AI/github/StarBI/.run/DataEase%20Frontend.run.xml)

## 4. 后端运行配置

新建一个 `Application` 类型运行配置：

- Name: `DataEase Backend`
- Main class: `io.dataease.CoreApplication`
- Use classpath of module: `core-backend`
- VM options:

```text
-Duser.home=$PROJECT_DIR$/tmp/dataease-local/home -Dspring.config.additional-location=file:$PROJECT_DIR$/tmp/dataease-local/spring/
```

- Active profiles: `standalone`
- Working directory: `$PROJECT_DIR$/dataease/core/core-backend`

后端关键入口和配置：

- 启动类: [CoreApplication.java](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/CoreApplication.java)
- 默认端口: [application.yml](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/application.yml)
- 单机版数据库配置: [application-standalone.yml](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/resources/application-standalone.yml)

启动成功后后端地址：

- `http://localhost:8100`
- Swagger: `http://localhost:8100/swagger-ui.html`

## 5. 前端运行配置

新建一个 `npm` 类型运行配置：

- Name: `DataEase Frontend`
- package.json: [package.json](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/package.json)
- Command: `run`
- Scripts: `dev`
- Working directory: `$PROJECT_DIR$/dataease/core/core-frontend`

前端默认地址：

- `http://localhost:8080`

前端代理已经指向本地后端：

- 代理配置: [config/dev.ts](/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/config/dev.ts)
- `/api -> http://localhost:8100/de2api`

## 6. 第一次启动建议

1. 先启动 MySQL 和 Redis
2. 先跑后端
3. 再跑前端
4. 浏览器打开 `http://localhost:8080`

## 7. 当前已处理的源码兼容点

为了让 `standalone` 源码启动也能读本地目录覆盖配置，已经把下面几个位置改成了优先读取 `ConfigUtils`：

- [StaticResourceConstants.java](/Users/chenliyong/AI/github/StarBI/dataease/sdk/common/src/main/java/io/dataease/constant/StaticResourceConstants.java)
- [VisualizationExcelUtils.java](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/visualization/utils/VisualizationExcelUtils.java)
- [ExcelUtils.java](/Users/chenliyong/AI/github/StarBI/dataease/core/core-backend/src/main/java/io/dataease/datasource/provider/ExcelUtils.java)

这样本地运行时，地图、外观、插件、报表、Excel 临时目录等不再强依赖系统 `/opt/dataease2.0`。

## 8. 需要注意

- 终端里已经安装 `mvn 3.9.14`，但命令行下请优先配合 `JDK 21` 使用
- IDEA 里也请把 Maven importer/runner 的 JDK 显式设为 `21`
- 前端如果使用本机 Node，版本高于 `23.11.x` 也可能能跑，但推荐尽量和项目声明版本保持一致
