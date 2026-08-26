---
title: "Image Segmentation in Android"
description: "In the world of mobile applications, making sense of the images our devices capture is a fascinating and crucial task. Imagine your phone recognizing objects or people in your..."
pubDate: 2023-11-22
tags: ["android", "deep-learning", "ml-kit", "machine-learning", "ios"]
mediumUrl: "https://medium.com/appcent/image-segmentation-in-android-80ba75ffa5e9"
heroImage: "/images/image-segmentation-in-android/01-1-rXByp-MgoNfJLxz7co8TPQ.png"
---

![](/images/image-segmentation-in-android/01-1-rXByp-MgoNfJLxz7co8TPQ.png)

### Removing background from images in Android with ease!

In the world of mobile applications, making sense of the images our devices capture is a fascinating and crucial task. Imagine your phone recognizing objects or people in your photos automatically — this is where image segmentation comes into play. Image segmentation involves the smart separation of different parts of an image, making it easier for our devices to understand and interact with the visual information they receive.

Picture your favorite photo editing app effortlessly isolating the background or recognizing the objects in your pictures. In this guide, we’ll explore the magic behind image segmentation in Android, understanding how it divides images into meaningful sections. Whether you’re curious about the technology that powers image-based features or interested in enhancing your app’s user experience, this article will unravel the simplicity and power of image segmentation in the Android environment.

![](/images/image-segmentation-in-android/02-0-rsO0vsSxJKPsGgZX.png)

*[MLKit’s Subject Segmentation](https://developers.google.com/ml-kit/vision/subject-segmentation?hl=en)*

## What is image segmentation

Image segmentation is like giving a superpower to computers: the ability to understand and investigate images. In simple terms, it’s the process of breaking down an image into different parts, almost like recognizing different puzzle pieces. Each part, or segment, is defined by certain characteristics like color, texture, or shape. This makes it easier for a computer to grasp and analyze what’s happening in an image. Think of it as labeling every pixel in a photo, so the computer knows which pixels belong to the sky, which to the trees, and so on. This superpower is invaluable for tasks like object recognition, medical imaging, and even making cool filters in your favorite photo app.

![](/images/image-segmentation-in-android/03-0-uuBJzCzd4TwQ0xrB.jpg)

Segmentation comes in two flavors: similarity and discontinuity.

**Similarity:** *Similarity is like grouping together pixels that look alike, such as having similar colors. Imagine a computer recognizing a bunch of red apples in a photo because they share the same color.*

**Discontinuity:*** Discontinuity, on the other hand, focuses on changes in pixel intensity, like recognizing the edges or boundaries between objects. It’s the reason your camera can identify the outline of your face in a selfie. These two methods are the secret ingredients that help computers make sense of images*

## Image Segmentation Techniques

Now, let’s explore how computers pull off this image segmentation. Traditional techniques have been around for a while and are like the classic tools. **Thresholding** is the go-to method where pixels are divided into classes based on their intensity. It’s like saying, “If a pixel is brighter than this, it’s part of the foreground; otherwise, it’s the background.” Another classic is **region-based segmentation**, where pixels with similar characteristics (like color or texture) get grouped together. It’s akin to sorting M&M candies by color.

Then, there’s the high-tech stuff — **deep learning techniques**. This is where computers learn to see and understand images almost like humans. Using neural networks, they figure out which features in an image matter the most. It’s like training a computer to recognize faces or objects, and then using that knowledge to break down an image into meaningful parts.

## Entering the image segmentation

We will dive into this example and try to make our background remover on Android with examples.

![](/images/image-segmentation-in-android/04-1-QG9xArEKh4XrDxOQ9t5xOA.png)

### 1. ML Kit’s Subject Segmentation API

> Allows developers to easily separate multiple subjects from the background in a picture, enabling use cases such as sticker creation, background swap, or adding cool effects to subjects.

> Subjects are defined as the most prominent people, pets, or objects in the foreground of the image. If 2 subjects are very close or touching each other, they are considered a single subject.

Let’s do some coding

First we need to add the ML Kit subject segmentation library to our app-level gradle file

> In your project-level build.gradle file, make sure to include Google's Maven repository in both your buildscript and allprojects sections.

```
dependencies {
...
    implementation("com.google.android.gms:play-services-mlkit-subject-segmentation:16.0.0-beta1")
...
}
```

> You can configure your app to automatically download the model to the device after your app is installed from the Play Store. To do so, add the following declaration to your app’s AndroidManifest.xml file:

```
<application>
...    
    <meta-data
            android:name="com.google.mlkit.vision.DEPENDENCIES"
            android:value="subject_segment" />
...
</application>
```

And then we can create our Helper class for removing background:

```
/**
 * Helper class for performing image segmentation using the SubjectSegmentation API.
 * This class encapsulates the functionality for obtaining foreground segmentation results from input images.
 */
object ImageSegmentationHelper {

    // Options for configuring the SubjectSegmenter
    private val options = SubjectSegmenterOptions.Builder()
.enableForegroundConfidenceMask()
.enableForegroundBitmap()
.build()

    // SubjectSegmenter instance initialized with the specified options
    private val segmenter = SubjectSegmentation.getClient(options)

    /**
     * Asynchronously processes the given input Bitmap image and retrieves the foreground segmentation result.
     *
     * @param image The input image in Bitmap format to be segmented.
     * @return A suspend function that, when invoked, provides the result Bitmap of the foreground segmentation.
     * @throws Exception if there is an error during the segmentation process.
     */
    suspend fun getResult(image: Bitmap) = suspendCoroutine {
        // Convert the input Bitmap image to InputImage format
        val inputImage = InputImage.fromBitmap(image, 0)

        // Process the input image using the SubjectSegmenter
        segmenter.process(inputImage)
.addOnSuccessListener { result ->
                // Resume the coroutine with the foreground Bitmap result on success
                it.resume(result.foregroundBitmap)
            }
.addOnFailureListener {e ->
                // Resume the coroutine with an exception in case of failure
                it.resumeWithException(e)
            }
    }
}
```

On the UI we need to do some changes to get an image from gallery and then we can use the bitmap for segmentation with ImageSegmentationHelper object.

```
/**
 * Composable for the ImageSegmenterScreen, providing an interactive screen for image segmentation.
 * Utilizes Jetpack Compose for UI components and integrates with the ImageSegmentationHelper for segmentation processing.
 */
@Composable
fun ImageSegmenterScreen() {
    val context = LocalContext.current

    // State to hold the output bitmap after segmentation
    val outputImage: MutableState<Bitmap?> = remember {
        mutableStateOf<Bitmap?>(null)
    }

    // State to hold the input bitmap before segmentation
    val inputImage: MutableState<Bitmap?> = remember {
        mutableStateOf(null)
    }

    // ActivityResultLauncher for picking visual media from the device
    val pickMedia = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
        // Callback for handling the result of media selection
        onResult = { uri ->
            if (uri != null) {
                // Load the selected image into the inputImage state
                inputImage.value =
                    MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
            } else {
                Log.d("PhotoPicker", "No media selected")
            }
        })

    // State to track the loading status during image segmentation
    var loading: Boolean by remember {
        mutableStateOf(false)
    }

    // State to toggle between displaying the segmented result and the original image
    var isOriginal: Boolean by remember {
        mutableStateOf(false)
    }

    // Effect to trigger image segmentation when the input image changes
    LaunchedEffect(key1 = inputImage.value) {
        inputImage.value?.let { bitmap ->
            // Set loading to true before starting the segmentation process
            loading = true
            // Perform image segmentation using ImageSegmentationHelper
            val output = ImageSegmentationHelper.getResult(bitmap)
            // Update the outputImage state with the segmented result
            outputImage.value = output
            // Set loading back to false after segmentation is complete
            loading = false
        }
    }

    // Scaffold composable for overall screen structure
    Scaffold { paddingValues ->
        Box(modifier = Modifier.background(Color.White)) {
            // Row containing the "Open Gallery" button
            Row(
                horizontalArrangement = Arrangement.End,
                modifier = Modifier
.padding(paddingValues)
.fillMaxWidth()
            ) {
                Button(onClick = {
                    // Launch the media picker to select an image from the gallery
                    pickMedia.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                }) {
                    Text(text = "Open Gallery")
                }
            }
            // Box containing the image display area and loading indicator
            Box(
                modifier = Modifier
.fillMaxSize()
.padding(paddingValues),
                contentAlignment = Alignment.Center,
            ) {
                // Display the segmented result or original image based on the isOriginal state
                if (outputImage.value != null && inputImage.value != null) {
                    Image(
                        bitmap = if (!isOriginal) outputImage.value!!.asImageBitmap() else inputImage.value!!.asImageBitmap(),
                        contentDescription = "",
                        Modifier
.fillMaxWidth()
                            // Toggle isOriginal state on image click for comparison
.clickable {
                                isOriginal = !isOriginal
                            }
                    )
                }

                // Display a loading indicator while image segmentation is in progress
                if (loading) {
                    CircularProgressIndicator()
                }
            }
        }
    }
}
```

In this example after we get the image from gallery with ActivityResultContracts then we are updating the inputImage state and with this we are starting to subject segmentation process by using ImageSegmentationHelper. As a result of this i want share some examples of our outputs.

![](/images/image-segmentation-in-android/05-1-3VKZ-MXO13PU9TWTUBjBPw.png)

*Removing background from images with Subject Segmentation API*

> ***App size: ~200 KB size increase.*

> ***Initialization time***: Users might have to wait for the model to download before first use.

### 2. Pre-trained Model’s Way

Also we can use pre-trained models for the removing background from images. For example U2Net is very handy machine learning models that used with similar applications for removing background. U2Net can generates a foreground mask for the detected object in images. After getting the foreground mask we can separate the another parts from images so with these methods we can remove backgrounds from images. U2Net provides two pre-trained model U2Net with a model size of 176.3 MB and U2NetP with a model size of 4.7 MB.

![](/images/image-segmentation-in-android/06-0-s5nQvnm3ytLHw4mY.png)

*[U2Net](https://github.com/xuebinqin/U-2-Net)*

U2NetP has less feature maps than U2net, and is therefore a lighter model. Actual model architecture of U2Net is like given below:

![](/images/image-segmentation-in-android/07-0-KUpqDCPlFrn9DwKA.png)

*U2-Net Architecture*

In here i want to share a library that uses the U2NetP model with PyTorch to remove the background from images.

[GitHub - AppcentMobile/removebg: Removebg is a library that effortlessly integrates the U2Net model, allowing users to easily remove backgrounds from images in their Android apps.](https://github.com/AppcentMobile/removebg)

It provides a similar usage way that we did in the first example. When we want to implement the Removebg in our android application.

```
allprojects {
    repositories {
...
      maven { url 'https://jitpack.io' }
    }
}

dependencies {
    implementation 'com.github.erenalpaslan:removebg:1.0.4'
}
```

First we need to update our gradle files. We need to add jitpack repository and also in the app level gradle file we need to add removebg library as a dependency.

```
val remover = RemoveBg(context)

remover.clearBackground(inputImage.value).collect { output ->
    outputImage.value = output
}
```

After creating an instance of RemoveBg we need to pass a bitmap as an input to clearBackground which returns a flow with bitmap.

```
//When inputImage state changed
LaunchedEffect(key1 = inputImage.value) {
    inputImage.value?.let { image ->
        remover.clearBackground(image)
.onStart {
                loading = true
            }
.onCompletion {
                loading = false
            }.collect { output ->
                outputImage.value = output
            }
    }
}
```

As a result you can check below. There are some examples.

![](/images/image-segmentation-in-android/08-1-pcP4aW6Ai5LKUJeODVzhGg.png)

*U2NetP examples*

## Conclusion

Image segmentation opens up exciting possibilities for understanding and enhancing visual content in mobile applications. By exploring tools like ML Kit’s Subject Segmentation API and pre-trained models such as U2NetP, we’ve witnessed how Android apps can easily remove backgrounds and unleash creative potential. Happy coding! 🚀🛡️

---

[Image Segmentation in Android](https://medium.com/appcent/image-segmentation-in-android-80ba75ffa5e9) was originally published in [Appcent](https://medium.com/appcent) on Medium, where people are continuing the conversation by highlighting and responding to this story.
