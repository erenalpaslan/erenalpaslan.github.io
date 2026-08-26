---
title: "Kotlin Coroutine: Exception Handling"
description: "How to handle exceptions in coroutines"
pubDate: 2023-11-06
tags: ["kotlin", "kotlin-coroutines", "android", "coroutine", "androiddev"]
mediumUrl: "https://medium.com/appcent/kotlin-coroutine-exception-handling-59be4e073d34"
heroImage: "/images/kotlin-coroutine-exception-handling/01-1-em1BIBosLwpbUQZZUEXgaw.png"
---

![](/images/kotlin-coroutine-exception-handling/01-1-em1BIBosLwpbUQZZUEXgaw.png)

How to handle exceptions in coroutines

In the world of developers, we dedicate perfecting the our application processes to provide proper user-experience. It’s not just about making things work perfectly; it’s also about handling issues gracefully when they arise. Exception handling is a critical aspect of software development and a way of the enhancing overall user experience.

> “Errors should never pass silently. Unless explicitly silenced.” — The Zen of Python by Tim Peters

Today, we’ll discuss how to handle errors when using coroutines. This is important for making your apps work smoothly, even when things don’t go as planned. We’ll cover the basics of error handling and show you practical ways to manage issues.

### Concept of a “Job” in Kotlin Coroutines

As you noticed creating a coroutine by coroutine builders launch and async returns a instance of Job. A Job is a cancelable thing that holds a life-cycle that you can manage the life-cycle of associated coroutine. It can be arranged in **parent-child** hierarchies. So you can combine the Jobs together for creating a hierarchies and you can have control over the life-cycle of the coroutine.

### Job states 🎯

![](/images/kotlin-coroutine-exception-handling/02-1-_wXbTwMJ2CMOUkAeR9v1BA.png)

*Job life-cycle*

Job controls the lifecycle of coroutine and it visits the above states. We don’t have an access to reach the states directly but we have related properties like isActive, isCompleted and isCancelled. When all children completed their works, isCompleted: true and isActive: false and isCancelled: false properties will be updated like this. Also failure of coroutine or calling the cancel() method leads the state of the job towards to the Cancelling state and at the Cancelled state properties will be updated like isCompleted: true and isCancelled: true and isActive: false

> What happens when an exception occurs in a job?

In the parent-child hierarchy when the cancellation of the parent occurs, recursively cancels all children. Also when an exceptions occurs in a child other than the CancellationException leads to cancellation of parent and its all other children.

```kotlin
runBlocking {
    launch {
        println("First Job")
    }

    launch {
        delay(2_000)
        println("Second Job")
    }

    delay(1_000)
    throw IllegalArgumentException()
}
```

In this example, after one second, an exception will occur in the parent coroutine, leading to the immediate cancellation of all its child coroutines, including the second job. So, what occurs when we encounter an exception other than CancellationException from the children?

```kotlin
runBlocking {
    launch {
        println("First Job")
        throw IllegalArgumentException()
    }

    launch {
        delay(2_000)
        println("Second Job")
    }
}
```

In this scenario, if the firstJob throws an IllegalArgumentException, the secondJob will be Cancelled immediately. Imagine you’ve separated UI components and service calls for each others. When a service job returns an error, the entire UI scope fails. So when we get Uncaught an error related to network calls this operation will costs us to lose the all other network calls processes for our UI.

### Supervision 👀

![](/images/kotlin-coroutine-exception-handling/03-1-I6HIvA56XiKC2pz5iI_Tcg.png)

*Failed child won’t cancels the parent and other children in supervisorScope*

In the SupervisorJob when a failure of a child won’t cancels the parent and other children. So SupervisorJob won’t propagate the exception and with other children and itself can continue to work without being Cancelled.

```kotlin
runBlocking {
    val scope = CoroutineScope(SupervisorJob())

    scope.launch {
        delay(1_000)
        println("firstJob")
        throw IllegalArgumentException()
    }
    val secondJob = scope.launch {
        delay(2_000)
        println("secondJob")
    }

    secondJob.join()
    println("Is secondJob cancelled: ${secondJob.isCancelled}")
    println("Is firstJob is cancelled: ${firstJob.isCancelled}")
}
```

In this case we created our CoroutineScope with SupervisorJob and one second later firstJob will throw an exception and being Cancelled but the exception will not being propagated in the SupervisorJob. So secondJob will be Completed without being Cancelled. Also we can create a scope using a builder called supervisorScope. This builder creates a CoroutineScope with aSupervisorJob. Unlike coroutineScope builder, which uses Job, when a child fails, it doesn’t impact the entire scope and other children.

```kotlin
runBlocking {
    supervisorScope {
        val firstJob = launch {
            delay(1_000)
            println("firstJob")
            throw IllegalArgumentException()
        }

        val secondJob = launch {
            delay(2_000)
            println("secondJob")
        }

        secondJob.join()
        println("Is secondJob cancelled: ${secondJob.isCancelled}")
        println("Is firstJob is cancelled: ${firstJob.isCancelled}")
    }
}
```

## Exception handling strategies 🚀

### When using “launch” ⚡

On the launch, exceptions will be thrown directly so you just use try/catch inside of the block:

```kotlin
runBlocking {
    val firstJob = launch {
        try {
            delay(1_000)
            println("firstJob")
            throw IllegalArgumentException()
        }catch (e: Exception) {
            println("Exception caught: $e")
        }
    }

    firstJob.join()
    println("Is firstJob cancelled: ${firstJob.isCancelled}")
}
```

Also you can use the CoroutineExceptionHandler which is similar to Thread.uncaughtExceptionHandler.

```kotlin
val exceptionHandler = CoroutineExceptionHandler {_, exception ->
    println("CoroutineExceptionHandler caught $exception")
}

runBlocking {
    val scope = CoroutineScope(exceptionHandler)

    val firstJob = scope.launch {
        delay(1_000)
        println("firstJob")
        throw IllegalArgumentException()
    }


    firstJob.join()
    println("Is firstJob cancelled: ${firstJob.isCancelled}")
}
```

In this case uncaught exceptions will be caught by CoroutineExceptionHandler

### When using “async” 🤹‍♂️

On the async, exceptions will not be thrown until getting the result by calling the Deferred.await(). You can use try/catch while getting result:

```kotlin
runBlocking {
    val scope = CoroutineScope(Dispatchers.Default)
    val deferred = scope.async {
        println("firstJob")
        throw IllegalArgumentException()
    }

    try {
        deferred.await()
    }catch (e: Exception) {
        println("Exception caught $e")
    }
}
```

### CoroutineExceptionHandler

> CoroutineExceptionHandler is a last-resort mechanism for global “catch all” behavior. You cannot recover from the exception in the CoroutineExceptionHandler. The coroutine had already completed with the corresponding exception when the handler is called. Normally, the handler is used to log the exception, show some kind of error message, terminate, and/or restart the application.

Must know that async builder always catches the exceptions serve them in the Deferred object and using the CoroutineExceptionHandler with async has no effect either.

```kotlin
val exceptionHandler = CoroutineExceptionHandler {_, exception ->
    println("CoroutineExceptionHandler caught $exception")
}

runBlocking {
    val scope = CoroutineScope(exceptionHandler)

    val firstJob = scope.async {
        throw IllegalArgumentException()
    }
}
```

In this case, CoroutineExceptionHandler remains ineffective and also exception won’t be propagated until we invoke Deferred.await().

### Conclusion

In the world of Android and Kotlin Coroutines, understanding how to handle exceptions is vital for providing a smooth user experience. We’ve explored Job States, learned about launch and async functions, and grasped the importance of CoroutineExceptionHandler

So, as you continue coding, remember the importance of error handling in Kotlin Coroutines. It’s your key to delivering a reliable user experience, even when things go awry. Happy coding! 🚀🛡️

---

[Kotlin Coroutine: Exception Handling](https://medium.com/appcent/kotlin-coroutine-exception-handling-59be4e073d34) was originally published in [Appcent](https://medium.com/appcent) on Medium, where people are continuing the conversation by highlighting and responding to this story.
