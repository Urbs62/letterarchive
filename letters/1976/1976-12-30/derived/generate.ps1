# Reproduce WebP sheet images from the unchanged composite photographs.
# Rectangles use pixels after applying the photograph's EXIF orientation.
param([switch]$Verify, [string]$WebPLibraryPath = $env:LETTERARCHIVE_WEBP_LIBRARY)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -Path (Join-Path $PSScriptRoot 'WebPCodec.cs') -ReferencedAssemblies System.Drawing
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $PSScriptRoot 'manifest.json') | ConvertFrom-Json
if (!$WebPLibraryPath) { $WebPLibraryPath = Join-Path $env:LOCALAPPDATA 'Programs/GIMP 3/bin/libwebp-7.dll' }
$version = [LetterArchiveWebP]::Initialize($WebPLibraryPath)
if ($version -ne $manifest.optimization.libwebp) {
    throw "Reproducible encoding requires libwebp $($manifest.optimization.libwebp); found $version. Set -WebPLibraryPath or LETTERARCHIVE_WEBP_LIBRARY."
}
foreach ($source in $manifest.sources) {
    $sourcePath = Join-Path (Split-Path $PSScriptRoot -Parent) $source.file
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $sourcePath).Hash.ToLowerInvariant() -ne $source.sha256) {
        throw "Source image changed: $($source.file)"
    }
    $photo = [System.Drawing.Bitmap]::new($sourcePath)
    try {
        $orientation = if ($photo.PropertyIdList -contains 274) { [BitConverter]::ToUInt16($photo.GetPropertyItem(274).Value, 0) } else { 1 }
        if ($orientation -ne 6) { throw "Unexpected source orientation: $orientation" }
        $photo.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone)
        foreach ($sheet in $manifest.sheets | Where-Object { $_.source -eq $source.file }) {
            $r = $sheet.rect
            $rect = [System.Drawing.Rectangle]::new($r[0], $r[1], $r[2], $r[3])
            $crop = $photo.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
            try {
                $destination = Join-Path $PSScriptRoot $sheet.file
                $expected = [LetterArchiveWebP]::Encode($crop, $manifest.optimization.quality, $false)
                $sha = [System.Security.Cryptography.SHA256]::Create()
                try {
                    $expectedHash = [BitConverter]::ToString($sha.ComputeHash($expected)).Replace('-', '').ToLowerInvariant()
                    if ($expectedHash -ne $sheet.sha256) { throw "Rebuilt image differs from reviewed WebP: $($sheet.file)" }
                    if ($Verify) {
                        $actual = [System.IO.File]::ReadAllBytes($destination)
                        if ([Convert]::ToBase64String($sha.ComputeHash($actual)) -ne [Convert]::ToBase64String($sha.ComputeHash($expected))) {
                            throw "WebP differs from rebuilt image: $($sheet.file)"
                        }
                    } else {
                        [System.IO.File]::WriteAllBytes($destination, $expected)
                    }
                } finally { $sha.Dispose() }
            } finally { $crop.Dispose() }
        }
    } finally { $photo.Dispose() }
}
Write-Output "32 WebP sheets $(if ($Verify) { 'verified' } else { 'generated' }); quality=$($manifest.optimization.quality), libwebp=$version; original photographs unchanged."
