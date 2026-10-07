// Mounts anywidget-style ES modules (`export default { render({ model, el }) }`) on a static page.
//
// Usage:
//   <div data-widget="ptycho-ms" data-widget-config='{"key": "value"}'></div>
//   <script type="module" src="/assets/js/widgets/mount.js"></script>
//
// The module is loaded from the same directory as this file (`<name>.js`), and the optional JSON config is exposed
// through a minimal `model.get(key)` shim, matching what MyST/Jupyter anywidget hosts provide.

const base = new URL(".", import.meta.url);

async function mount(el) {
  const name = el.dataset.widget;
  let config = {};
  if (el.dataset.widgetConfig) {
    try {
      config = JSON.parse(el.dataset.widgetConfig);
    } catch (err) {
      console.error(`[widgets] bad data-widget-config for "${name}"`, err);
    }
  }
  const model = { get: (key) => config[key], set() {}, on() {}, off() {}, save_changes() {} };
  try {
    const mod = await import(new URL(`${name}.js`, base));
    const widget = mod.default || mod;
    await widget.render({ model, el });
  } catch (err) {
    console.error(`[widgets] failed to mount "${name}"`, err);
    el.textContent = "This interactive demo could not be loaded in your browser.";
  }
}

document.querySelectorAll("[data-widget]").forEach(mount);
