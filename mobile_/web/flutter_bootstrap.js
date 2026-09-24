{{flutter_js}}
{{flutter_build_config}}

// Chrome/Chromium: use the Chromium CanvasKit build so Skia shaders
// compile against Chrome's WebGL stack (fixes "Shader compilation error /
// (unknown error)" with the generic full CanvasKit binary on some GPUs).
_flutter.loader.load({
  config: {
    canvasKitVariant: "chromium",
  },
});
