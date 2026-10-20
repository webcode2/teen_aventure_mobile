import java.io.FileInputStream
import java.util.Properties
import java.security.KeyStore

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
}

// Environment overrides let local/CI builds supply credentials without editing secret files.
val signingEnvironment = mapOf(
    "storeFile" to "ANDROID_KEYSTORE_PATH",
    "storePassword" to "ANDROID_KEYSTORE_PASSWORD",
    "keyAlias" to "ANDROID_KEY_ALIAS",
    "keyPassword" to "ANDROID_KEY_PASSWORD",
    "storeType" to "ANDROID_KEYSTORE_TYPE",
)
for ((property, environment) in signingEnvironment) {
    providers.environmentVariable(environment).orNull?.let { keystoreProperties.setProperty(property, it) }
}
val hasReleaseSigning = listOf("storeFile", "storePassword", "keyAlias", "keyPassword").all {
    !keystoreProperties.getProperty(it).isNullOrBlank() && keystoreProperties.getProperty(it) != "CHANGE_ME"
}

android {
    namespace = "com.elasctroclud.teen_aventure"
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.elasctroclud.teen_aventure"
        minSdk = flutter.minSdkVersion
        targetSdk = 36
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keystoreProperties.getProperty("storeType")?.let { storeType = it }
            }
        }
    }

    buildTypes {
        release {
            signingConfig =
                if (hasReleaseSigning) {
                    signingConfigs.getByName("release")
                } else {
                    null
                }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            ndk {
                debugSymbolLevel = "SYMBOL_TABLE"
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

// A debug certificate can never be uploaded as a production signing identity.
// Keep debug builds usable while failing release tasks before compilation.
gradle.taskGraph.whenReady {
    val buildsRelease = allTasks.any {
        it.project == project && it.name.contains("Release", ignoreCase = true)
    }
    if (buildsRelease) {
        check(hasReleaseSigning) {
            "Release signing is required. Configure android/key.properties or ANDROID_KEYSTORE_* environment overrides with your Play upload key; debug signing is not permitted for release builds."
        }
        check(file(keystoreProperties.getProperty("storeFile")).isFile) {
            "The configured release keystore does not exist. Restore the correct Play upload keystore before building."
        }
        val store = try {
            // Detect PKCS12/JKS from the existing file unless explicitly configured.
            val configuredType = keystoreProperties.getProperty("storeType")
            if (configuredType == null) {
                KeyStore.getInstance(file(keystoreProperties.getProperty("storeFile")), keystoreProperties.getProperty("storePassword").toCharArray())
            } else {
                KeyStore.getInstance(configuredType).apply {
                    file(keystoreProperties.getProperty("storeFile")).inputStream().use {
                        load(it, keystoreProperties.getProperty("storePassword").toCharArray())
                    }
                }
            }
        } catch (_: Exception) {
            throw GradleException("Cannot unlock the release keystore. Check storePassword / ANDROID_KEYSTORE_PASSWORD and storeType. The existing upload key has not been changed.")
        }
        val alias = keystoreProperties.getProperty("keyAlias")
        check(store.isKeyEntry(alias)) { "Release keyAlias does not identify a private key in this keystore. Check keyAlias / ANDROID_KEY_ALIAS." }
        val key = try {
            store.getKey(alias, keystoreProperties.getProperty("keyPassword").toCharArray())
        } catch (_: Exception) {
            throw GradleException("Cannot unlock the release private key. Check keyPassword / ANDROID_KEY_PASSWORD.")
        }
        check(key is java.security.PrivateKey) { "The configured release signing entry is not a private key." }
    }
}
