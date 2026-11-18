plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Release signing: values come from ~/.gradle/gradle.properties or environment variables
// (DECKBOX_STORE_FILE, DECKBOX_STORE_PASSWORD, DECKBOX_KEY_ALIAS, DECKBOX_KEY_PASSWORD).
// Without them, release builds fall back to the debug key so the project still builds anywhere.
fun signingValue(name: String): String? =
    (project.findProperty(name) as String?) ?: System.getenv(name)

android {
    namespace = "io.github.dubstep2004.deckbox"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.dubstep2004.deckbox"
        minSdk = 21 // Android 5.0; see CONTRIBUTING.md before changing it
        targetSdk = 35
        versionCode = 51
        versionName = "1.6.0"
    }

    signingConfigs {
        val storeFile = signingValue("DECKBOX_STORE_FILE")
        if (storeFile != null && file(storeFile).exists()) {
            create("release") {
                this.storeFile = file(storeFile)
                storePassword = signingValue("DECKBOX_STORE_PASSWORD")
                keyAlias = signingValue("DECKBOX_KEY_ALIAS")
                keyPassword = signingValue("DECKBOX_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    lint {
        // Unsupported framework calls can crash old phones before the panel opens.
        fatal += "NewApi"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
