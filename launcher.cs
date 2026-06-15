using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        // Get the directory where Nexus.exe is currently executing
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        
        string batPath = Path.Combine(baseDir, "Run-Nexus.bat");
        string htaPath = Path.Combine(baseDir, "Splash.hta");

        // 1. Launch the Splash Screen safely if it exists
        if (File.Exists(htaPath))
        {
            try
            {
                Process splash = new Process();
                splash.StartInfo.FileName = "mshta.exe";
                splash.StartInfo.Arguments = "\"" + htaPath + "\"";
                splash.StartInfo.UseShellExecute = true;
                splash.Start();
            }
            catch 
            { 
                // Fallback silently if mshta fails so the main core engine can still try to boot
            }
        }

        // 2. Launch the Core Batch File completely hidden from view
        if (File.Exists(batPath))
        {
            try
            {
                Process backend = new Process();
                backend.StartInfo.FileName = "cmd.exe";
                
                // The \" wrapping ensures paths with spaces (like C:\Program Files) do not break
                backend.StartInfo.Arguments = "/c \"" + batPath + "\""; 
                backend.StartInfo.CreateNoWindow = true;
                backend.StartInfo.UseShellExecute = false;
                backend.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Failed to initialize Nexus core background engines:\n" + ex.Message, 
                    "Nexus Boot Error", 
                    MessageBoxButtons.OK, 
                    MessageBoxIcon.Error
                );
            }
        }
        else
        {
            MessageBox.Show(
                "Critical Error: 'Run-Nexus.bat' could not be found in the application root directory.", 
                "Nexus Launch Error", 
                MessageBoxButtons.OK, 
                MessageBoxIcon.Error
            );
        }
    }
}