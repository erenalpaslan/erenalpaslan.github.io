---
title: "Kotlin Multiplatform: A Guide to Ktor Integration"
description: "In the ever-evolving landscape of mobile app development, the need for efficient cross-platform solutions has become paramount. Kotlin Multiplatform (KMP) emerges as a powerful..."
pubDate: 2023-11-13
tags: ["kotlin-multiplatform", "android", "ktor", "kotlin", "kotlin-beginners"]
mediumUrl: "https://medium.com/appcent/kotlin-multiplatform-a-guide-to-ktor-integration-3c480c8ad545"
heroImage: "/images/kotlin-multiplatform-a-guide-to-ktor-integration/01-1-buftRI3p9bdyJ0wL-Ce0Yg.png"
---

![](/images/kotlin-multiplatform-a-guide-to-ktor-integration/01-1-buftRI3p9bdyJ0wL-Ce0Yg.png)

In the ever-evolving landscape of mobile app development, the need for efficient cross-platform solutions has become paramount. Kotlin Multiplatform (KMP) emerges as a powerful and versatile framework, allowing developers to share code seamlessly across various platforms. In conjunction with KMP, Ktor, a flexible and lightweight networking library, offers a compelling solution for handling HTTP requests in Kotlin-based applications.

Its modular design allows developers to pick and choose components based on project requirements, enhancing the adaptability of the library. Whether handling simple RESTful APIs or managing complex WebSocket connections, Ktor provides an intuitive and expressive interface, minimizing boilerplate code and allowing developers to focus on building robust, feature-rich applications.

### Setting Up a Kotlin Multiplatform Project

We starts with the creating a new Kotlin multiplatform application.

![](/images/kotlin-multiplatform-a-guide-to-ktor-integration/02-1-W75i5NS50HzHwnMMbY47rQ.png)

*Creating Kotlin Multiplatform app in Android Studio*

In the upcoming sections, we’ll set up our application and add the Ktor client library to it. But before we dive in, you can take a look at an example where the Ktor HTTP client is used in a Fusion which is a KMP application for Android and iOS. This example essentially uses the OpenAI API to generate images based on prompts by DALL-E. I’ll be referring to this example in the article for guidance.

[GitHub - erenalpaslan/Fusion-Open: Fusion is an multiplatform application for the editing images by using ChatGPT and DALL-E](https://github.com/erenalpaslan/Fusion-Open)

### Adding client dependencies

Ktor library extends its functionality with plugins that should be installed and configured. In this article we will cover some of the Ktor plugins in here. First we need to import them into our version catalog.

```kotlin
[versions]
ktor-client = "2.3.6" #latest version of Ktor

[libraries]
#Core library and required plugins in here
ktor-client-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor-client" }
ktor-client-darwin = { module = "io.ktor:ktor-client-darwin", version.ref = "ktor-client" }
ktor-client-encoding = { module = "io.ktor:ktor-client-encoding", version.ref = "ktor-client" }
ktor-client-logging = { module = "io.ktor:ktor-client-logging", version.ref = "ktor-client" }
ktor-client-okhttp = { module = "io.ktor:ktor-client-okhttp", version.ref = "ktor-client" }
ktor-serialization-kotlinx-json = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor-client" }
ktor-client-content-negotiation = { module = "io.ktor:ktor-client-content-negotiation", version.ref = "ktor-client" }
```

Then we need to update the shared module’s build.gradle.kts. In here we will implement all these dependencies but be careful there are some native specific dependencies.

In shared module’s build.gradle.kts

```kotlin
plugins {
  kotlin("plugin.serialization") version "1.9.10"
}
kotlin {
...
    sourceSets {
        val commonMain by getting {
            dependencies {
...
                implementation(libs.ktor.client.core)
                implementation(libs.ktor.client.logging)
                implementation(libs.ktor.serialization.kotlinx.json)
                implementation(libs.ktor.client.content.negotiation)
                implementation(libs.ktor.client.encoding)
            }
        }
        val androidMain by getting {
            dependencies {
                implementation(libs.ktor.client.okhttp)
            }
        }
        val iosX64Main by getting
        val iosArm64Main by getting
        val iosSimulatorArm64Main by getting
        val iosMain by creating {
            dependsOn(commonMain)
            iosX64Main.dependsOn(this)
            iosArm64Main.dependsOn(this)
            iosSimulatorArm64Main.dependsOn(this)
            dependencies {
                implementation(libs.ktor.client.darwin)
            }
        }
    }
}
```

With these we are ready to create our Ktor HTTP client. Ktor requires a engines to processing the network calls. You can use the Ktor for other platforms and each platforms has specified engines. For example you can use Jetty or Apache for JVM applications, OkHttp for Android applications and Curl for Desktop applications. In our case, we’ll use OkHttp for Android and Darwin for iOS in this example.

So we need to declare our expect/actual client variable and then need to implement our client for each platform specified in shared module.

### Handling Networking with Ktor

```kotlin
//In shared/commonMain declaring expected construct 
//for the using platform-specific APIs
expect val client: HttpClient
```

For each Android and iOS module we need to implement our actual variable

```kotlin
//In shared/androidMain
@OptIn(ExperimentalSerializationApi::class)
actual val client: HttpClient
    get() = HttpClient(OkHttp) {
        //Timeout plugin to set up timeout milliseconds for client
        install(HttpTimeout) {
            socketTimeoutMillis = 60_000
            requestTimeoutMillis = 60_000
        }
        //Logging plugin combined with kermit(KMP Logger library)
        install(Logging) {
            logger = Logger.DEFAULT
            level = LogLevel.ALL
            logger = object: Logger {
                override fun log(message: String) {
                    co.touchlab.kermit.Logger.d(tag = "KtorClient") {
                        message
                    }
                }
            }
        }
        //We can configure the BASE_URL and also 
        //the deafult headers by defaultRequest builder
        defaultRequest {
            header("Content-Type", "application/json")
            header("Authorization", "Bearer ${BuildKonfig.OPENAI_API_KEY}")
            url("https://api.openai.com/v1/")
        }
        //ContentNegotiation plugin for negotiationing media types between the client and server
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
                explicitNulls = false
            })
        }
    }
```

For the iOS we need to create our HttpClient with Darwin engine:

```kotlin
//In shared/iosMain
actual val client: HttpClient
    get() = HttpClient(Darwin) {
...
    }
```

So now we can use the client from shared module with specific native implementations. For example we can generate an image from user’s prompt with OpenAI API:

```kotlin
class OpenAIRepositoryImpl: OpenAIRepository {
    override suspend fun imageGeneration(
        prompt: String
    ): ImageGenerationResponse? {
        val imageGenerationResponse: ImageGenerationResponse? = client.post {
            url("images/generations")
            setBody(ImageGenerationRequest(
                model = "dall-e-3",
                prompt = prompt,
                n = 1,
                size = "1024x1024"
            ))
        }.body()

        return imageGenerationResponse
    }

}
```

Ktor includes basic methods for all HTTP methods like get, post and put also we can create a request by request method and able to declare the specified HTTP method in request block. In this example for creating a request i used the post method and in HttpRequestBuild setup my request. As you remember when we were creating the client we set our BASE_URL in the DefaultRequest block so we need to add the remaining parts from the endpoint with url builder.

```kotlin
@Serializable
data class ImageGenerationRequest(
    val model: String,
    val prompt: String?,
    val n: Int,
    val size: String
)
```

> With the enabled ContentNegotiation plugin, you can send a class instance within a request body as JSON. To do this, pass a class instance to the setBody function

We send a body by the setBody method in HttpRequestBuilder. With ContentNegotiation plugin we can able to deserialize the response body to given data class. HttpResponse class holds the all informations about the response such as status, headers and body.

### Platform-Specific Implementations

We can able to customize our engines that specified for related platforms. For example we are using the OkHttp for Android and we can add the interceptor in it.

```kotlin
engine {
    Interceptor {chaint ->
        val chainRequest = chain.request()
        //TODO: Configure request for the interceptor in here
        return@Interceptor chain.proceed(chainRequest)
    }
}
```

> All engines share several common properties exposed by HttpClientEngineConfig

### Custom plugins

Ktor allows to create your own plugins and you can able to install it to your Ktor client. For creating a custom plugin we need to use createClientPlugin method. For example we can create a custom logger plugin:

```kotlin
val CustomLoggerPlugin = createClientPlugin("CustomLoggerPlugin") {
    onRequest { request, content ->
        Logger.d(tag = "LoggerPlugin") { "=============REQUEST==============" }
        Logger.d(tag = "LoggerPlugin") { "${request.method.value} => ${request.url}" }
        Logger.d(tag = "LoggerPlugin") { "BODY => ${request.body}" }
        Logger.d(tag = "LoggerPlugin") { "=============END-REQUEST==============" }
    }

    onResponse {response ->
        Logger.d(tag = "LoggerPlugin") { "=============RESPONSE==============" }
        Logger.d(tag = "LoggerPlugin") { "${response.request.method.value} / ${response.status} => ${response.request.url}" }
        Logger.d(tag = "LoggerPlugin") { "BODY => ${response}" }
        Logger.d(tag = "LoggerPlugin") { "=============END-RESPONSE==============" }
    }
}
```

And inside of the HttpClientConfig block we need to install our custom logger plugin

```kotlin
actual val client: HttpClient
    get() = HttpClient(OkHttp) {
...
      install(CustomLoggerPlugin)
...
    }
```

As a result of this we will log request and response related informations like below:

```kotlin
=============REQUEST==============
POST => https://api.openai.com/v1/images/generations
BODY => ImageGenerationRequest(model=dall-e-3, prompt=View of field, n=1, size=1024x1024)
=============END-REQUEST==============
=============RESPONSE==============
POST / 200  => https://api.openai.com/v1/images/generations
BODY => HttpResponse[https://api.openai.com/v1/images/generations, 200 ]
=============END-RESPONSE==============
```

### Conclusion

This guide has walked you through the essential steps of integrating Ktor into your Kotlin Multiplatform project. The flexibility and power of Kotlin Multiplatform, combined with the simplicity and efficiency of Ktor, offer a robust solution for cross-platform development. As you embark on your Kotlin Multiplatform journey, feel free to explore custom plugins and leverage the strengths of each platform. Happy coding!

---

[Kotlin Multiplatform: A Guide to Ktor Integration](https://medium.com/appcent/kotlin-multiplatform-a-guide-to-ktor-integration-3c480c8ad545) was originally published in [Appcent](https://medium.com/appcent) on Medium, where people are continuing the conversation by highlighting and responding to this story.
