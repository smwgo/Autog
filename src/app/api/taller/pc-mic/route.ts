import { NextRequest, NextResponse } from "next/server";
import { spawn, execFileSync, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ActiveRecording {
  proc: ChildProcessWithoutNullStreams;
  wavPath: string;
  startedAt: number;
  savedPromise: Promise<boolean>;
}

const globalForMic = globalThis as unknown as {
  __autogActivePcMic?: Map<string, ActiveRecording>;
};

if (!globalForMic.__autogActivePcMic) {
  globalForMic.__autogActivePcMic = new Map<string, ActiveRecording>();
}

const activeMap = globalForMic.__autogActivePcMic;

function ensureNativeRecorderExe(): string | null {
  if (process.platform !== "win32") return null;

  const tmpDir = os.tmpdir();
  const exePath = path.join(tmpDir, "autog_pc_mic_rec_v1.exe");
  if (fs.existsSync(exePath)) {
    return exePath;
  }

  const csPath = path.join(tmpDir, "autog_pc_mic_rec_v1.cs");
  const csSource = `
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class Program {
    [DllImport("winmm.dll", EntryPoint = "mciSendStringA", CharSet = CharSet.Ansi)]
    public static extern int mciSendString(string lpszCommand, StringBuilder lpszReturnString, int cchReturn, IntPtr hwndCallback);

    public static int Main(string[] args) {
        if (args.Length < 1) return 1;
        string outPath = args[0];
        StringBuilder sb = new StringBuilder(256);

        int r1 = mciSendString("open new Type waveaudio Alias recsound", sb, 256, IntPtr.Zero);
        if (r1 != 0) {
            Console.WriteLine("ERR_OPEN:" + r1);
            Console.Out.Flush();
            return 2;
        }

        mciSendString("set recsound time format ms bitspersample 16 channels 1 samplespersec 44100 bytespersec 88200 alignment 2", sb, 256, IntPtr.Zero);
        int r3 = mciSendString("record recsound", sb, 256, IntPtr.Zero);
        if (r3 != 0) {
            mciSendString("close recsound", sb, 256, IntPtr.Zero);
            Console.WriteLine("ERR_REC:" + r3);
            Console.Out.Flush();
            return 3;
        }

        Console.WriteLine("READY");
        Console.Out.Flush();

        // Wait for STOP line on stdin (or EOF)
        try {
            Console.In.ReadLine();
        } catch {}

        mciSendString("stop recsound", sb, 256, IntPtr.Zero);
        int rSave = mciSendString("save recsound \\"" + outPath + "\\"", sb, 256, IntPtr.Zero);
        mciSendString("close recsound", sb, 256, IntPtr.Zero);

        Console.WriteLine("SAVED:" + rSave);
        Console.Out.Flush();
        return 0;
    }
}
`;

  try {
    fs.writeFileSync(csPath, csSource, "utf8");
    const cscCandidates = [
      "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe",
      "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe",
    ];
    const csc = cscCandidates.find((p) => fs.existsSync(p));
    if (!csc) return null;

    execFileSync(csc, ["/nologo", "/optimize+", `/out:${exePath}`, csPath], {
      windowsHide: true,
      timeout: 10000,
    });
    return fs.existsSync(exePath) ? exePath : null;
  } catch {
    return null;
  }
}

function ensureNativeTranscriberExe(): string | null {
  if (process.platform !== "win32") return null;

  const tmpDir = os.tmpdir();
  const exePath = path.join(tmpDir, "autog_pc_wav_transcribe_v1.exe");
  if (fs.existsSync(exePath)) {
    return exePath;
  }

  const csPath = path.join(tmpDir, "autog_pc_wav_transcribe_v1.cs");
  const csSource = `
using System;
using System.IO;
using System.Globalization;
using System.Speech.Recognition;
using System.Text;

public class Program {
    public static int Main(string[] args) {
        Console.OutputEncoding = Encoding.UTF8;
        if (args.Length < 1 || !File.Exists(args[0])) return 1;
        string wavPath = args[0];
        try {
            RecognizerInfo targetInfo = null;
            foreach (RecognizerInfo ri in SpeechRecognitionEngine.InstalledRecognizers()) {
                if (ri.Culture.Name.StartsWith("es", StringComparison.OrdinalIgnoreCase)) {
                    targetInfo = ri;
                    break;
                }
            }
            if (targetInfo == null) {
                foreach (RecognizerInfo ri in SpeechRecognitionEngine.InstalledRecognizers()) {
                    targetInfo = ri;
                    break;
                }
            }
            if (targetInfo == null) return 2;

            using (SpeechRecognitionEngine sre = new SpeechRecognitionEngine(targetInfo)) {
                sre.LoadGrammar(new DictationGrammar());
                sre.SetInputToWaveFile(wavPath);
                StringBuilder sb = new StringBuilder();
                while (true) {
                    RecognitionResult res = sre.Recognize();
                    if (res == null) break;
                    if (!string.IsNullOrWhiteSpace(res.Text)) {
                        if (sb.Length > 0) sb.Append(" ");
                        sb.Append(res.Text.Trim());
                    }
                }
                Console.WriteLine("TEXT:" + sb.ToString());
                return 0;
            }
        } catch (Exception ex) {
            Console.WriteLine("ERR:" + ex.Message);
            return 3;
        }
    }
}
`;

  try {
    fs.writeFileSync(csPath, csSource, "utf8");
    const cscCandidates = [
      "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe",
      "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe",
    ];
    const csc = cscCandidates.find((p) => fs.existsSync(p));
    if (!csc) return null;

    const speechDllCandidates = [
      "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\WPF\\System.Speech.dll",
      "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\WPF\\System.Speech.dll",
      "C:\\Program Files (x86)\\Reference Assemblies\\Microsoft\\Framework\\.NETFramework\\v4.0\\System.Speech.dll",
    ];
    const speechDll = speechDllCandidates.find((p) => fs.existsSync(p)) || "System.Speech.dll";

    execFileSync(
      csc,
      ["/nologo", "/optimize+", `/r:${speechDll}`, `/out:${exePath}`, csPath],
      {
        windowsHide: true,
        timeout: 10000,
      }
    );
    return fs.existsSync(exePath) ? exePath : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;
    const sessionId = String(body?.sessionId || "default");

    if (process.platform !== "win32") {
      return NextResponse.json(
        { success: false, error: "Grabación nativa de PC solo disponible en Windows." },
        { status: 400 }
      );
    }

    if (action === "start") {
      // Detener cualquier grabación previa huérfana
      for (const [oldId, oldRec] of activeMap.entries()) {
        try {
          oldRec.proc.stdin.write("STOP\n");
          oldRec.proc.kill();
        } catch {}
        activeMap.delete(oldId);
      }

      const exePath = ensureNativeRecorderExe();
      if (!exePath) {
        return NextResponse.json(
          { success: false, error: "No se pudo inicializar el grabador nativo de Windows." },
          { status: 500 }
        );
      }

      const wavPath = path.join(os.tmpdir(), `autog_mic_${sessionId}_${Date.now()}.wav`);
      const proc = spawn(/*turbopackIgnore: true*/ exePath, [wavPath], {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let resolveReady: (ok: boolean) => void;
      const readyPromise = new Promise<boolean>((res) => {
        resolveReady = res;
      });

      let resolveSaved: (ok: boolean) => void;
      const savedPromise = new Promise<boolean>((res) => {
        resolveSaved = res;
      });

      let stdoutBuf = "";
      proc.stdout.on("data", (chunk) => {
        stdoutBuf += chunk.toString();
        if (stdoutBuf.includes("READY")) {
          resolveReady(true);
        }
        if (stdoutBuf.includes("ERR_")) {
          resolveReady(false);
        }
        if (stdoutBuf.includes("SAVED:")) {
          resolveSaved(true);
        }
      });

      proc.on("exit", () => {
        resolveReady(false);
        resolveSaved(true);
      });

      activeMap.set(sessionId, {
        proc,
        wavPath,
        startedAt: Date.now(),
        savedPromise,
      });

      const started = await Promise.race([
        readyPromise,
        new Promise<boolean>((res) => setTimeout(() => res(false), 2500)),
      ]);

      if (!started) {
        try {
          proc.kill();
        } catch {}
        activeMap.delete(sessionId);
        return NextResponse.json(
          { success: false, error: "El micrófono de Windows no respondió al iniciar." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        sessionId,
        status: "recording",
      });
    }

    if (action === "stop") {
      const rec = activeMap.get(sessionId) || Array.from(activeMap.values())[0];
      if (!rec) {
        return NextResponse.json(
          { success: false, error: "No hay una sesión activa de grabación en PC." },
          { status: 404 }
        );
      }

      activeMap.delete(sessionId);

      try {
        rec.proc.stdin.write("STOP\n");
        rec.proc.stdin.end();
      } catch {}

      await Promise.race([
        rec.savedPromise,
        new Promise<boolean>((res) => setTimeout(() => res(true), 2500)),
      ]);

      if (!fs.existsSync(rec.wavPath)) {
        return NextResponse.json(
          { success: false, error: "No se generó el archivo WAV de grabación." },
          { status: 500 }
        );
      }

      const wavBuffer = fs.readFileSync(rec.wavPath);
      let transcribedText = "";
      try {
        const trExe = ensureNativeTranscriberExe();
        if (trExe) {
          const out = execFileSync(/*turbopackIgnore: true*/ trExe, [rec.wavPath], {
            windowsHide: true,
            timeout: 6000,
            encoding: "utf8",
          });
          const match = String(out || "").match(/TEXT:(.*)/);
          if (match && match[1]) {
            transcribedText = match[1].trim();
          }
        }
      } catch {}

      try {
        fs.unlinkSync(rec.wavPath);
      } catch {}

      return NextResponse.json({
        success: true,
        mimeType: "audio/wav",
        size: wavBuffer.length,
        audioBase64: wavBuffer.toString("base64"),
        text: transcribedText,
      });
    }

    if (action === "transcribe") {
      const audioBase64 = String(body?.audioBase64 || "").trim();
      if (!audioBase64) {
        return NextResponse.json({ success: false, error: "Falta audioBase64" }, { status: 400 });
      }
      const trExe = ensureNativeTranscriberExe();
      if (!trExe) {
        return NextResponse.json({ success: false, text: "" });
      }
      const tmpWav = path.join(os.tmpdir(), `autog_tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`);
      try {
        const buf = Buffer.from(audioBase64, "base64");
        fs.writeFileSync(tmpWav, buf);
        const out = execFileSync(/*turbopackIgnore: true*/ trExe, [tmpWav], {
          windowsHide: true,
          timeout: 8000,
          encoding: "utf8",
        });
        const match = String(out || "").match(/TEXT:(.*)/);
        const text = match && match[1] ? match[1].trim() : "";
        return NextResponse.json({ success: true, text });
      } catch {
        return NextResponse.json({ success: false, text: "" });
      } finally {
        try {
          if (fs.existsSync(tmpWav)) fs.unlinkSync(tmpWav);
        } catch {}
      }
    }

    return NextResponse.json({ success: false, error: "Acción inválida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error interno en grabadora PC" },
      { status: 500 }
    );
  }
}
