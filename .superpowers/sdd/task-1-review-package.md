# Review package — Task 1 (working tree; no commits)

## Files touched

 M admin/package-lock.json
 M admin/package.json
 M admin/src/route.ts
?? admin/src/path-helpers.test.ts
?? admin/src/path-helpers.ts
-rw-rw-r-- 1 bash bash 1646 Sep 24 13:35 admin/src/path-helpers.test.ts
-rw-rw-r-- 1 bash bash 1714 Sep 24 13:37 admin/src/path-helpers.ts
-rwxr-xr-x 1 bash bash  452 Sep 24 13:37 admin/src/route.ts

## Diff (tracked) + new files

```diff
diff --git a/admin/package-lock.json b/admin/package-lock.json
index bdb3825..965cc16 100644
--- a/admin/package-lock.json
+++ b/admin/package-lock.json
@@ -14,14 +14,18 @@
         "jsdom": "^30.0.1",
         "react": "^19.2.8",
         "react-dom": "^19.2.8",
-        "vitest": "^4.1.11"
+        "react-router": "^8.4.0",
+        "vitest": "^4.1.11",
+        "zod": "^4.6.5"
       },
       "devDependencies": {
+        "@tailwindcss/vite": "^4.3.3",
         "@types/node": "^24.13.3",
         "@types/react": "^19.2.18",
         "@types/react-dom": "^19.2.4",
         "@vitejs/plugin-react": "^6.1.0",
         "oxlint": "^1.79.0",
+        "tailwindcss": "^4.3.3",
         "typescript": "~6.0.2",
         "vite": "^8.2.2"
       }
@@ -260,12 +264,55 @@
         }
       }
     },
+    "node_modules/@jridgewell/gen-mapping": {
+      "version": "0.3.13",
+      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
+      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "@jridgewell/sourcemap-codec": "^1.5.0",
+        "@jridgewell/trace-mapping": "^0.3.24"
+      }
+    },
+    "node_modules/@jridgewell/remapping": {
+      "version": "2.3.5",
+      "resolved": "https://registry.npmjs.org/@jridgewell/remapping/-/remapping-2.3.5.tgz",
+      "integrity": "sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "@jridgewell/gen-mapping": "^0.3.5",
+        "@jridgewell/trace-mapping": "^0.3.24"
+      }
+    },
+    "node_modules/@jridgewell/resolve-uri": {
+      "version": "3.1.2",
+      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
+      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">=6.0.0"
+      }
+    },
     "node_modules/@jridgewell/sourcemap-codec": {
       "version": "1.5.5",
       "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.5.tgz",
       "integrity": "sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==",
       "license": "MIT"
     },
+    "node_modules/@jridgewell/trace-mapping": {
+      "version": "0.3.31",
+      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.31.tgz",
+      "integrity": "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "@jridgewell/resolve-uri": "^3.1.0",
+        "@jridgewell/sourcemap-codec": "^1.4.14"
+      }
+    },
     "node_modules/@oxc-project/types": {
       "version": "0.146.0",
       "resolved": "https://registry.npmjs.org/@oxc-project/types/-/types-0.146.0.tgz",
@@ -622,6 +669,12 @@
         "node": "^20.19.0 || >=22.12.0"
       }
     },
+    "node_modules/@remix-run/route-pattern": {
+      "version": "0.22.1",
+      "resolved": "https://registry.npmjs.org/@remix-run/route-pattern/-/route-pattern-0.22.1.tgz",
+      "integrity": "sha512-czdGJWh09Lapvcqt7Vb09KlrU2PhRJ8xQaI+AItTuD9aDJ5MAgxnS38lnys6Ll+6RJEqPiaUqTwIQhVLwFvv+w==",
+      "license": "MIT"
+    },
     "node_modules/@rolldown/binding-android-arm-eabi": {
       "version": "1.2.5",
       "resolved": "https://registry.npmjs.org/@rolldown/binding-android-arm-eabi/-/binding-android-arm-eabi-1.2.5.tgz",
@@ -892,6 +945,563 @@
       "integrity": "sha512-l2aFy5jALhniG5HgqrD6jXLi/rUWrKvqN/qJx6yoJsgKhblVd+iqqU4RCXavm/jPityDo5TCvKMnpjKnOriy0w==",
       "license": "MIT"
     },
+    "node_modules/@tailwindcss/node": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/node/-/node-4.3.3.tgz",
+      "integrity": "sha512-/T8IKEsf9VTU6tLjgC7+sv2mOPtQxzE2jMw7u4Tt40Tx+QSZxpzh95/H6cMKoja9XuW7iMdLJYBB0o9G1CaAgg==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "@jridgewell/remapping": "^2.3.5",
+        "enhanced-resolve": "^5.24.1",
+        "jiti": "^2.7.0",
+        "lightningcss": "1.32.0",
+        "magic-string": "^0.30.21",
+        "source-map-js": "^1.2.1",
+        "tailwindcss": "4.3.3"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.32.0.tgz",
+      "integrity": "sha512-NXYBzinNrblfraPGyrbPoD19C1h9lfI/1mzgWYvXUTe414Gz/X1FD2XBZSZM7rRTrMA8JL3OtAaGifrIKhQ5yQ==",
+      "dev": true,
+      "license": "MPL-2.0",
+      "dependencies": {
+        "detect-libc": "^2.0.3"
+      },
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      },
+      "optionalDependencies": {
+        "lightningcss-android-arm64": "1.32.0",
+        "lightningcss-darwin-arm64": "1.32.0",
+        "lightningcss-darwin-x64": "1.32.0",
+        "lightningcss-freebsd-x64": "1.32.0",
+        "lightningcss-linux-arm-gnueabihf": "1.32.0",
+        "lightningcss-linux-arm64-gnu": "1.32.0",
+        "lightningcss-linux-arm64-musl": "1.32.0",
+        "lightningcss-linux-x64-gnu": "1.32.0",
+        "lightningcss-linux-x64-musl": "1.32.0",
+        "lightningcss-win32-arm64-msvc": "1.32.0",
+        "lightningcss-win32-x64-msvc": "1.32.0"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-android-arm64": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-android-arm64/-/lightningcss-android-arm64-1.32.0.tgz",
+      "integrity": "sha512-YK7/ClTt4kAK0vo6w3X+Pnm0D2cf2vPHbhOXdoNti1Ga0al1P4TBZhwjATvjNwLEBCnKvjJc2jQgHXH0NEwlAg==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "android"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-darwin-arm64": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.32.0.tgz",
+      "integrity": "sha512-RzeG9Ju5bag2Bv1/lwlVJvBE3q6TtXskdZLLCyfg5pt+HLz9BqlICO7LZM7VHNTTn/5PRhHFBSjk5lc4cmscPQ==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "darwin"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-darwin-x64": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-darwin-x64/-/lightningcss-darwin-x64-1.32.0.tgz",
+      "integrity": "sha512-U+QsBp2m/s2wqpUYT/6wnlagdZbtZdndSmut/NJqlCcMLTWp5muCrID+K5UJ6jqD2BFshejCYXniPDbNh73V8w==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "darwin"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-freebsd-x64": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-freebsd-x64/-/lightningcss-freebsd-x64-1.32.0.tgz",
+      "integrity": "sha512-JCTigedEksZk3tHTTthnMdVfGf61Fky8Ji2E4YjUTEQX14xiy/lTzXnu1vwiZe3bYe0q+SpsSH/CTeDXK6WHig==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "freebsd"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-linux-arm-gnueabihf": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/-/lightningcss-linux-arm-gnueabihf-1.32.0.tgz",
+      "integrity": "sha512-x6rnnpRa2GL0zQOkt6rts3YDPzduLpWvwAF6EMhXFVZXD4tPrBkEFqzGowzCsIWsPjqSK+tyNEODUBXeeVHSkw==",
+      "cpu": [
+        "arm"
+      ],
+      "dev": true,
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-linux-arm64-gnu": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-gnu/-/lightningcss-linux-arm64-gnu-1.32.0.tgz",
+      "integrity": "sha512-0nnMyoyOLRJXfbMOilaSRcLH3Jw5z9HDNGfT/gwCPgaDjnx0i8w7vBzFLFR1f6CMLKF8gVbebmkUN3fa/kQJpQ==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "libc": [
+        "glibc"
+      ],
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-linux-arm64-musl": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-musl/-/lightningcss-linux-arm64-musl-1.32.0.tgz",
+      "integrity": "sha512-UpQkoenr4UJEzgVIYpI80lDFvRmPVg6oqboNHfoH4CQIfNA+HOrZ7Mo7KZP02dC6LjghPQJeBsvXhJod/wnIBg==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "libc": [
+        "musl"
+      ],
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-linux-x64-gnu": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.32.0.tgz",
+      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "libc": [
+        "glibc"
+      ],
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-linux-x64-musl": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-musl/-/lightningcss-linux-x64-musl-1.32.0.tgz",
+      "integrity": "sha512-bYcLp+Vb0awsiXg/80uCRezCYHNg1/l3mt0gzHnWV9XP1W5sKa5/TCdGWaR/zBM2PeF/HbsQv/j2URNOiVuxWg==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "libc": [
+        "musl"
+      ],
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-win32-arm64-msvc": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-win32-arm64-msvc/-/lightningcss-win32-arm64-msvc-1.32.0.tgz",
+      "integrity": "sha512-8SbC8BR40pS6baCM8sbtYDSwEVQd4JlFTOlaD3gWGHfThTcABnNDBda6eTZeqbofalIJhFx0qKzgHJmcPTnGdw==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "win32"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/node/node_modules/lightningcss-win32-x64-msvc": {
+      "version": "1.32.0",
+      "resolved": "https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.32.0.tgz",
+      "integrity": "sha512-Amq9B/SoZYdDi1kFrojnoqPLxYhQ4Wo5XiL8EVJrVsB8ARoC1PWW6VGtT0WKCemjy8aC+louJnjS7U18x3b06Q==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "license": "MPL-2.0",
+      "optional": true,
+      "os": [
+        "win32"
+      ],
+      "engines": {
+        "node": ">= 12.0.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/parcel"
+      }
+    },
+    "node_modules/@tailwindcss/oxide": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide/-/oxide-4.3.3.tgz",
+      "integrity": "sha512-krXjAikiaFSPaK/FkAQT5UTx3VormQaiZ5hBFlJZ9UFQGB/rwg1MZIhHAG9smMQRTdyJxP6Qt5MwMtdyU5FWrA==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">= 20"
+      },
+      "optionalDependencies": {
+        "@tailwindcss/oxide-android-arm64": "4.3.3",
+        "@tailwindcss/oxide-darwin-arm64": "4.3.3",
+        "@tailwindcss/oxide-darwin-x64": "4.3.3",
+        "@tailwindcss/oxide-freebsd-x64": "4.3.3",
+        "@tailwindcss/oxide-linux-arm-gnueabihf": "4.3.3",
+        "@tailwindcss/oxide-linux-arm64-gnu": "4.3.3",
+        "@tailwindcss/oxide-linux-arm64-musl": "4.3.3",
+        "@tailwindcss/oxide-linux-x64-gnu": "4.3.3",
+        "@tailwindcss/oxide-linux-x64-musl": "4.3.3",
+        "@tailwindcss/oxide-wasm32-wasi": "4.3.3",
+        "@tailwindcss/oxide-win32-arm64-msvc": "4.3.3",
+        "@tailwindcss/oxide-win32-x64-msvc": "4.3.3"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-android-arm64": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-android-arm64/-/oxide-android-arm64-4.3.3.tgz",
+      "integrity": "sha512-Y85A2gmPSkl5Ve5qR86GL4HT509cFqQh1aes9p3sSkyTPwt0Pppf3GkwGe4JPACcRYjgJIEhQgM6dBClnr0NYw==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "android"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-darwin-arm64": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-arm64/-/oxide-darwin-arm64-4.3.3.tgz",
+      "integrity": "sha512-BiaWatpBcERQFDlOjRDpIVXuFK5PJez5SA4JMg6VYZdBYU+qKfV/vqjcIs+IYmtitf1xYQZTwXvU/8y4lfZUGw==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "darwin"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-darwin-x64": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-darwin-x64/-/oxide-darwin-x64-4.3.3.tgz",
+      "integrity": "sha512-fAeUqfV5ndhxRwai8cXGzdLvul9utWOmeTkv69unv4ZXixjn61Z+p9lCWdwOwA3TYboG3BwdVuN/RDjhBRl0mw==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "darwin"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-freebsd-x64": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-freebsd-x64/-/oxide-freebsd-x64-4.3.3.tgz",
+      "integrity": "sha512-iyf5bV6+wnAlflVeEy7R25dupxTNECZN5QMI0qNT6eT+EgaGdZcKhGkr5SdoaWiLJ3spLqIY9VCeSGrwmtg4kw==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "freebsd"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-linux-arm-gnueabihf": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm-gnueabihf/-/oxide-linux-arm-gnueabihf-4.3.3.tgz",
+      "integrity": "sha512-aAYUprJAJQWWbRrPvtjdroZ56Md+JM8pMiopS6xGEwDfLhqj+2ver2p4nU4Mb3CRqcMmNBjo8KkUgcxhkzVQGQ==",
+      "cpu": [
+        "arm"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-linux-arm64-gnu": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm64-gnu/-/oxide-linux-arm64-gnu-4.3.3.tgz",
+      "integrity": "sha512-nDxldcEENOxZRzC2uu9jrutZdAAQtb+8WWDCSnWL1zvBk1+FN+x6MtDViPB5AJMfttVCUhehGWus3XBPgatM/w==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "libc": [
+        "glibc"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-linux-arm64-musl": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-arm64-musl/-/oxide-linux-arm64-musl-4.3.3.tgz",
+      "integrity": "sha512-Md44bD6veX/PC5iyF8cDVnw4HBIANZepRZZ7a8DQOvkfo5WUBwcp6iAuCUz23u+4SUkhJlD3eL7hNdW8ezd/kA==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "libc": [
+        "musl"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-linux-x64-gnu": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-gnu/-/oxide-linux-x64-gnu-4.3.3.tgz",
+      "integrity": "sha512-tx7us1muwOKAKWao2v/GaafFeQboE6aj88vC6ziN2NCGcRm8gWUhwjzg+YdVB1e4boAtdtma4L43onunI6NS4w==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "libc": [
+        "glibc"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-linux-x64-musl": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-linux-x64-musl/-/oxide-linux-x64-musl-4.3.3.tgz",
+      "integrity": "sha512-SJxX60smvHgasZoBy11dX6YRjXJFovwWBoedhbQPOBzgFWBHGB+TVPWB9BxzR7TTxU8FQZAI2AyiNCMzFm8Img==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "libc": [
+        "musl"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-wasm32-wasi": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-wasm32-wasi/-/oxide-wasm32-wasi-4.3.3.tgz",
+      "integrity": "sha512-jx1+rPhY/5Ympkktd656HBWEBLxP7dH06losBLjjf5vgCODXvi9KhtftWcMIwTFIDqBr7cRnQkdLnAG+IOlGvQ==",
+      "bundleDependencies": [
+        "@napi-rs/wasm-runtime",
+        "@emnapi/core",
+        "@emnapi/runtime",
+        "@tybys/wasm-util",
+        "@emnapi/wasi-threads",
+        "tslib"
+      ],
+      "cpu": [
+        "wasm32"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "dependencies": {
+        "@emnapi/core": "^1.11.1",
+        "@emnapi/runtime": "^1.11.1",
+        "@emnapi/wasi-threads": "^1.2.2",
+        "@napi-rs/wasm-runtime": "^1.1.4",
+        "@tybys/wasm-util": "^0.10.2",
+        "tslib": "^2.8.1"
+      },
+      "engines": {
+        "node": ">=14.0.0"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-win32-arm64-msvc": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-arm64-msvc/-/oxide-win32-arm64-msvc-4.3.3.tgz",
+      "integrity": "sha512-3rc292Ca2ceK6Ulcc/bAVnTs/3nDtoPhyEKlgPv+yQJQi/JS/AMJlqzxvlDacL1nekbrcf6bTqp/jV4qgnPxNQ==",
+      "cpu": [
+        "arm64"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "win32"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/oxide-win32-x64-msvc": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/oxide-win32-x64-msvc/-/oxide-win32-x64-msvc-4.3.3.tgz",
+      "integrity": "sha512-yJ0pwIVc/nYeGoV02WtsN8KYyLQv7kyI2wDnkezyJlGGjkd4QLwDGAwl47YpPJeuI0M0ObaXGSPjvWDPeTPggw==",
+      "cpu": [
+        "x64"
+      ],
+      "dev": true,
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "win32"
+      ],
+      "engines": {
+        "node": ">= 20"
+      }
+    },
+    "node_modules/@tailwindcss/vite": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/@tailwindcss/vite/-/vite-4.3.3.tgz",
+      "integrity": "sha512-yYU8cogLeSh/ms2jh8Fj7jaba/EWa7Ja6GoUqYZaraEuCI5YS6ms6ObZgjjedm+jm6XZjdNRWBpPP6Z86oOxcw==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "@tailwindcss/node": "4.3.3",
+        "@tailwindcss/oxide": "4.3.3",
+        "tailwindcss": "4.3.3"
+      },
+      "peerDependencies": {
+        "vite": "^5.2.0 || ^6 || ^7 || ^8"
+      }
+    },
     "node_modules/@testing-library/dom": {
       "version": "10.4.1",
       "resolved": "https://registry.npmjs.org/@testing-library/dom/-/dom-10.4.1.tgz",
@@ -1246,6 +1856,12 @@
       "integrity": "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==",
       "license": "MIT"
     },
+    "node_modules/cookie-es": {
+      "version": "3.1.1",
+      "resolved": "https://registry.npmjs.org/cookie-es/-/cookie-es-3.1.1.tgz",
+      "integrity": "sha512-UaXxwISYJPTr9hwQxMFYZ7kNhSXboMXP+Z3TRX6f1/NyaGPfuNUZOWP1pUEb75B2HjfklIYLVRfWiFZJyC6Npg==",
+      "license": "MIT"
+    },
     "node_modules/css-tree": {
       "version": "3.2.1",
       "resolved": "https://registry.npmjs.org/css-tree/-/css-tree-3.2.1.tgz",
@@ -1330,6 +1946,20 @@
       "license": "MIT",
       "peer": true
     },
+    "node_modules/enhanced-resolve": {
+      "version": "5.25.1",
+      "resolved": "https://registry.npmjs.org/enhanced-resolve/-/enhanced-resolve-5.25.1.tgz",
+      "integrity": "sha512-nGXts5znJzmWPu+mIE9izCOzdg63oJca2mDzGWWTth7sr4aCToKcoyFVBQwN75Ij5Pf6p510EwkTqViTRzDV+w==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "graceful-fs": "^4.2.4",
+        "tapable": "^2.3.3"
+      },
+      "engines": {
+        "node": ">=10.13.0"
+      }
+    },
     "node_modules/entities": {
       "version": "8.0.0",
       "resolved": "https://registry.npmjs.org/entities/-/entities-8.0.0.tgz",
@@ -1397,6 +2027,13 @@
         "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
       }
     },
+    "node_modules/graceful-fs": {
+      "version": "4.2.11",
+      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
+      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
+      "dev": true,
+      "license": "ISC"
+    },
     "node_modules/html-encoding-sniffer": {
       "version": "6.0.0",
       "resolved": "https://registry.npmjs.org/html-encoding-sniffer/-/html-encoding-sniffer-6.0.0.tgz",
@@ -1424,6 +2061,16 @@
       "integrity": "sha512-bCYeRA2rVibKZd+s2625gGnGF/t7DSqDs4dP7CrLA1m7jKWz6pps0LpYLJN8Q64HtmPKJ1hrN3nzPNKFEKOUiQ==",
       "license": "MIT"
     },
+    "node_modules/jiti": {
+      "version": "2.7.0",
+      "resolved": "https://registry.npmjs.org/jiti/-/jiti-2.7.0.tgz",
+      "integrity": "sha512-AC/7JofJvZGrrneWNaEnJeOLUx+JlGt7tNa0wZiRPT4MY1wmfKjt2+6O2p2uz2+skll8OZZmJMNqeke7kKbNgQ==",
+      "devOptional": true,
+      "license": "MIT",
+      "bin": {
+        "jiti": "lib/jiti-cli.mjs"
+      }
+    },
     "node_modules/js-tokens": {
       "version": "4.0.0",
       "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
@@ -1971,6 +2618,28 @@
       "license": "MIT",
       "peer": true
     },
+    "node_modules/react-router": {
+      "version": "8.4.0",
+      "resolved": "https://registry.npmjs.org/react-router/-/react-router-8.4.0.tgz",
+      "integrity": "sha512-JtydAkBvU9UTEe5qNC+POhu+ZBNM7rlKY2IegwXc7Idj7xfRG16x5RZrw3mju+XlqBxfvb2ky9P3jUp9WyWC1g==",
+      "license": "MIT",
+      "dependencies": {
+        "@remix-run/route-pattern": "^0.22.1",
+        "cookie-es": "^3.1.1"
+      },
+      "engines": {
+        "node": ">=22.22.0"
+      },
+      "peerDependencies": {
+        "react": ">=19.2.7",
+        "react-dom": ">=19.2.7"
+      },
+      "peerDependenciesMeta": {
+        "react-dom": {
+          "optional": true
+        }
+      }
+    },
     "node_modules/redent": {
       "version": "3.0.0",
       "resolved": "https://registry.npmjs.org/redent/-/redent-3.0.0.tgz",
@@ -2089,6 +2758,27 @@
       "integrity": "sha512-9QNk5KwDF+Bvz+PyObkmSYjI5ksVUYtjW7AU22r2NKcfLJcXp96hkDWU3+XndOsUb+AQ9QhfzfCT2O+CNWT5Tw==",
       "license": "MIT"
     },
+    "node_modules/tailwindcss": {
+      "version": "4.3.3",
+      "resolved": "https://registry.npmjs.org/tailwindcss/-/tailwindcss-4.3.3.tgz",
+      "integrity": "sha512-gOhV3P7ufE62QDGg1zVaTgCR+EtPv92k2nIhVcVKcLmxT1sUBsQGhnZj175j+MqRt4zLF7ic+sCYjfhxMxj7YQ==",
+      "dev": true,
+      "license": "MIT"
+    },
+    "node_modules/tapable": {
+      "version": "2.3.3",
+      "resolved": "https://registry.npmjs.org/tapable/-/tapable-2.3.3.tgz",
+      "integrity": "sha512-uxc/zpqFg6x7C8vOE7lh6Lbda8eEL9zmVm/PLeTPBRhh1xCgdWaQ+J1CUieGpIfm2HdtsUpRv+HshiasBMcc6A==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">=6"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/webpack"
+      }
+    },
     "node_modules/tinybench": {
       "version": "2.9.0",
       "resolved": "https://registry.npmjs.org/tinybench/-/tinybench-2.9.0.tgz",
@@ -2441,6 +3131,15 @@
       "resolved": "https://registry.npmjs.org/xmlchars/-/xmlchars-2.2.0.tgz",
       "integrity": "sha512-JZnDKK8B0RCDw84FNdDAIpZK+JuJw+s7Lz8nksI7SIuU3UXJJslUthsi+uWBUYOwPFwW7W7PRLRfUKpxjtjFCw==",
       "license": "MIT"
+    },
+    "node_modules/zod": {
+      "version": "4.6.5",
+      "resolved": "https://registry.npmjs.org/zod/-/zod-4.6.5.tgz",
+      "integrity": "sha512-v5l/aFXZQeai4awLbOpSoHecE9UiMrnfx75tEXLjNonXVARxQ5mOeipTjROUchszUNCqnE+hqAMujRsRHsut2Q==",
+      "license": "MIT",
+      "funding": {
+        "url": "https://github.com/sponsors/colinhacks"
+      }
     }
   }
 }
diff --git a/admin/package.json b/admin/package.json
index 1267f67..90d0d16 100644
--- a/admin/package.json
+++ b/admin/package.json
@@ -17,14 +17,18 @@
     "jsdom": "^30.0.1",
     "react": "^19.2.8",
     "react-dom": "^19.2.8",
-    "vitest": "^4.1.11"
+    "react-router": "^8.4.0",
+    "vitest": "^4.1.11",
+    "zod": "^4.6.5"
   },
   "devDependencies": {
+    "@tailwindcss/vite": "^4.3.3",
     "@types/node": "^24.13.3",
     "@types/react": "^19.2.18",
     "@types/react-dom": "^19.2.4",
     "@vitejs/plugin-react": "^6.1.0",
     "oxlint": "^1.79.0",
+    "tailwindcss": "^4.3.3",
     "typescript": "~6.0.2",
     "vite": "^8.2.2"
   }
diff --git a/admin/src/route.ts b/admin/src/route.ts
index 71d117b..62d44db 100644
--- a/admin/src/route.ts
+++ b/admin/src/route.ts
@@ -1,58 +1,21 @@
-export const TABS = [
-  'dashboard',
-  'people',
-  'churches',
-  'quests',
-  'notifications',
-  'consent',
-  'reports',
-  'deletions',
-  'scoring',
-] as const;
-
-export type Tab = typeof TABS[number];
-export type AuthView = 'login' | 'forgot' | 'reset';
-export type Route =
-  | { kind: 'auth'; view: AuthView; token?: string }
-  | { kind: 'app'; tab: Tab };
-
-function parseQuery(raw: string) {
-  const q = raw.startsWith('?') ? raw.slice(1) : raw;
-  return new URLSearchParams(q);
-}
-
-export function parseHash(hash: string, authed: boolean): Route {
-  const stripped = (hash || '').replace(/^#/, '');
-  const [pathPart, queryPart = ''] = stripped.split('?');
-  const page = pathPart.replace(/^\//, '').toLowerCase();
-  const params = parseQuery(queryPart);
-  const resetToken = params.get('token') ?? '';
-
-  if (page === 'reset' || (resetToken && !authed && page === '')) {
-    return { kind: 'auth', view: 'reset', token: resetToken };
-  }
-  if (!authed) {
-    if (page === 'forgot') return { kind: 'auth', view: 'forgot' };
-    return { kind: 'auth', view: 'login' };
-  }
-  if ((TABS as readonly string[]).includes(page)) {
-    return { kind: 'app', tab: page as Tab };
-  }
-  return { kind: 'app', tab: 'dashboard' };
-}
-
-export function hashFor(route: Route) {
-  if (route.kind === 'auth') {
-    if (route.view === 'reset') {
-      return route.token ? `#/reset?token=${encodeURIComponent(route.token)}` : '#/reset';
-    }
-    return `#/${route.view}`;
-  }
-  return `#/${route.tab}`;
-}
-
-export function navigate(route: Route) {
-  const next = hashFor(route);
-  if (window.location.hash !== next) window.location.hash = next;
-  window.dispatchEvent(new Event('askhub:route'));
-}
+export const TABS = [
+  'dashboard',
+  'people',
+  'churches',
+  'groups',
+  'weeks',
+  'quests',
+  'puzzles',
+  'notifications',
+  'consent',
+  'reports',
+  'deletions',
+  'scoring',
+] as const;
+
+export type Tab = (typeof TABS)[number];
+
+/** @deprecated Removed in path-routing migration; do not use. */
+export function navigate(_route: unknown): void {
+  throw new Error('navigate() removed — use react-router useNavigate');
+}
```

## New file: path-helpers.ts
```ts
import { TABS, type Tab } from './route';

export const DASHBOARD_TAB_IDS = TABS.filter((t): t is Exclude<Tab, 'dashboard'> => t !== 'dashboard');

export function isDashboardTab(value: string): value is Tab {
  return (DASHBOARD_TAB_IDS as readonly string[]).includes(value);
}

export function safeStaffNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/app/dashboard';
  const pathOnly = next.split('?')[0] ?? next;
  if (pathOnly === '/app/dashboard' || pathOnly.startsWith('/app/dashboard/')) return next;
  return '/app/dashboard';
}

export function legacyHashToPath(hash: string): string | null {
  const raw = (hash || '').replace(/^#/, '');
  if (!raw) return null;
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.replace(/^\//, '').split('/').filter(Boolean);
  const page = (segments[0] || '').toLowerCase();
  const sub = segments[1] || '';
  const qs = queryPart ? `?${queryPart}` : '';

  if (page === 'landing' || page === 'home' || page === 'public') return '/';
  if (page === 'login') return '/app/login';
  if (page === 'forgot') return '/app/forgot';
  if (page === 'reset') return `/app/reset${qs}`;
  if (page === 'pastor' || page === 'church-portal') {
    const church = sub || new URLSearchParams(queryPart).get('church') || '';
    return church ? `/groups/${church}` : '/groups';
  }
  if (page === 'church') return sub ? `/groups/${sub}` : '/groups';
  if (page === 'dashboard' || page === '') return '/app/dashboard';
  if ((TABS as readonly string[]).includes(page) && page !== 'dashboard') {
    return `/app/dashboard/${page}${qs}`;
  }
  if (page) return '/app/dashboard';
  return null;
}
```

## New file: path-helpers.test.ts
```ts
import { describe, it, expect } from 'vitest';
import { isDashboardTab, safeStaffNext, legacyHashToPath } from './path-helpers';

describe('isDashboardTab', () => {
  it('accepts people and rejects dashboard and junk', () => {
    expect(isDashboardTab('people')).toBe(true);
    expect(isDashboardTab('dashboard')).toBe(false);
    expect(isDashboardTab('nope')).toBe(false);
  });
});

describe('safeStaffNext', () => {
  it('allows dashboard paths and rejects others', () => {
    expect(safeStaffNext('/app/dashboard')).toBe('/app/dashboard');
    expect(safeStaffNext('/app/dashboard/people')).toBe('/app/dashboard/people');
    expect(safeStaffNext('/app/dashboard/quests?week=3')).toBe('/app/dashboard/quests?week=3');
    expect(safeStaffNext('/groups')).toBe('/app/dashboard');
    expect(safeStaffNext('https://evil.example/')).toBe('/app/dashboard');
    expect(safeStaffNext(null)).toBe('/app/dashboard');
  });
});

describe('legacyHashToPath', () => {
  it('maps known hashes', () => {
    expect(legacyHashToPath('#/landing')).toBe('/');
    expect(legacyHashToPath('#/login')).toBe('/app/login');
    expect(legacyHashToPath('#/forgot')).toBe('/app/forgot');
    expect(legacyHashToPath('#/reset?token=abc')).toBe('/app/reset?token=abc');
    expect(legacyHashToPath('#/dashboard')).toBe('/app/dashboard');
    expect(legacyHashToPath('#/people')).toBe('/app/dashboard/people');
    expect(legacyHashToPath('#/pastor')).toBe('/groups');
    expect(legacyHashToPath('#/church/ch_1')).toBe('/groups/ch_1');
    expect(legacyHashToPath('')).toBe(null);
    expect(legacyHashToPath('#/unknown-tab')).toBe('/app/dashboard');
  });
});
```

## Current route.ts
```ts
export const TABS = [
  'dashboard',
  'people',
  'churches',
  'groups',
  'weeks',
  'quests',
  'puzzles',
  'notifications',
  'consent',
  'reports',
  'deletions',
  'scoring',
] as const;

export type Tab = (typeof TABS)[number];

/** @deprecated Removed in path-routing migration; do not use. */
export function navigate(_route: unknown): void {
  throw new Error('navigate() removed — use react-router useNavigate');
}
```
