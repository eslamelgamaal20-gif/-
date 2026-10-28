# EMG — CEP Edition (Arabic UI · no Creative Cloud needed)

This is the same EMG panel (Arabic UI, English prompt output), packaged as a **CEP extension**. CEP is the "Extensions (legacy)" panel system.
You install it by copying a folder, so you **do not need the Creative Cloud app, a subscription, or the UXP Developer Tool**.

**Compatible with:** Photoshop 2020 (v21), **2021 (v22)**, 2022, 2023 and 2024 on Windows and macOS.
(Adobe has announced that CEP will eventually be retired in future Photoshop versions. For those versions, use the UXP edition.)

## Install on Windows (automatic)
1. Close Photoshop.
2. **Extract** the ZIP (right-click → Extract All). Do not run anything from inside the ZIP.
3. Double-click **`install-windows.bat`** inside the extracted `Prompt-Studio-CEP` folder.
   If Windows SmartScreen appears, click **More info → Run anyway**.
4. Open Photoshop → **Window → Extensions (legacy) → Prompt Studio**.

## Install on Windows (manual)
1. Press **Win + R**, type `regedit` and press Enter.
2. Go to `HKEY_CURRENT_USER\Software\Adobe\CSXS.10` (create the `CSXS.10` key if it is missing).
   This is for Photoshop 2021. Use `CSXS.9` for 2020 and `CSXS.11` for 2022 or newer.
3. Right-click → New → **String Value**. Name it `PlayerDebugMode` and set its value to `1`.
4. Copy the `Prompt-Studio-CEP` folder to:
   `C:\Users\<YOUR-NAME>\AppData\Roaming\Adobe\CEP\extensions\`
   (Tip: paste `%APPDATA%\Adobe\CEP\extensions` into the Explorer address bar. Create the `CEP\extensions` folders if they don't exist.)
5. Restart Photoshop → **Window → Extensions (legacy) → Prompt Studio**.

## Install on macOS
1. Quit Photoshop and extract the ZIP.
2. Right-click **`install-mac.command`** → **Open** → Open. If it is blocked, open Terminal and run:
   `bash ~/Downloads/Prompt-Studio-CEP/install-mac.command`
3. Manual alternative: run `defaults write com.adobe.CSXS.10 PlayerDebugMode 1` in Terminal, then copy the folder to
   `~/Library/Application Support/Adobe/CEP/extensions/`.
4. Open Photoshop → **Window → Extensions (legacy) → Prompt Studio**.

## The panel does not appear?
- Make sure the folder contains `CSXS/manifest.xml` directly. It must not be nested in an extra folder.
- Make sure `PlayerDebugMode = 1` is set for the correct CSXS number. The installer sets 9, 10, 11 and 12.
- Restart Photoshop completely after installing.
- Photoshop 2020 shows the menu as **Window → Extensions** (without "legacy").

## Updating
Run the installer again. It replaces the old files. Your presets, history and settings are kept.

## Uninstall
Run `uninstall-windows.bat`, or delete the `com.promptstudio.cep` folder from the extensions folder.

## Debugging
1. The file `.debug` is included and enables remote debugging on port 8088.
2. With the panel open, open **Google Chrome** and go to `http://localhost:8088`.
3. Click **Prompt Studio** to open DevTools (Console, Elements, Sources).
4. The startup log shows `[Prompt Studio] ready (Photoshop CEP panel)`.
5. To reload after editing code, close and reopen the panel, or press F5 inside DevTools.

## Notes
- Data (presets, history, favorites, settings) is saved locally with `localStorage` inside the panel.
- Export/Import Presets uses native Save and Open dialogs.
- COPY uses the system clipboard. If it ever fails, the text is selected so you can press Ctrl/Cmd+C.


## المعاينة ثلاثية الأبعاد (WebGL)
- المشهد يُرسم بمكتبة three.js الموجودة داخل `js/vendor/three.bundle.js` (ملف واحد، بدون إنترنت).
- المعاينة تحتاج WebGL. لو الجهاز ما يدعمه، تظهر رسالة واضحة والبرومبت يعمل بشكل طبيعي.
- لإعادة بناء ملف المكتبة (للمطورين فقط، بعد `npm install three`):
  `npx esbuild scripts/three-entry.js --bundle --format=iife --minify --target=es2019 --outfile=public/Prompt-Studio/js/vendor/three.bundle.js`
