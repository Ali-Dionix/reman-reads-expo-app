@echo off
rem build-apk.cmd — a release APK (arm64 only) from the SHORT clone C:\rr\m.
rem Never build from the Downloads path: CMake's 250-char object-path limit
rem kills expo-modules-core and reanimated there. Run DETACHED (PowerShell
rem Start-Process) — a warm build is 45-75 s, a clean one ~5 min, and the
rem Bash tool caps at 10 min. See README.md.
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
set "ANDROID_HOME=C:\Users\mohsi\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d C:\rr\m\android
echo building in %CD%
call C:\rr\m\android\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --console=plain
echo GRADLE EXIT: %ERRORLEVEL%
