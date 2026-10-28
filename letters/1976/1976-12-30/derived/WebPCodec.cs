using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

// Thin binding to the installed libwebp encoder/decoder. No resampling,
// sharpening, rotation or other pixel transforms are performed here.
public static class LetterArchiveWebP {
    [DllImport("kernel32", CharSet=CharSet.Unicode, SetLastError=true)]
    private static extern IntPtr LoadLibraryEx(string path, IntPtr file, uint flags);
    [DllImport("libwebp-7.dll", CallingConvention=CallingConvention.Cdecl)]
    private static extern int WebPGetEncoderVersion();
    [DllImport("libwebp-7.dll", CallingConvention=CallingConvention.Cdecl)]
    private static extern UIntPtr WebPEncodeBGR(IntPtr bgr, int width, int height, int stride, float quality, out IntPtr output);
    [DllImport("libwebp-7.dll", CallingConvention=CallingConvention.Cdecl)]
    private static extern UIntPtr WebPEncodeLosslessBGR(IntPtr bgr, int width, int height, int stride, out IntPtr output);
    [DllImport("libwebp-7.dll", CallingConvention=CallingConvention.Cdecl)]
    private static extern IntPtr WebPDecodeBGRA(byte[] data, UIntPtr size, out int width, out int height);
    [DllImport("libwebp-7.dll", CallingConvention=CallingConvention.Cdecl)]
    private static extern void WebPFree(IntPtr data);

    public static string Initialize(string path) {
        if (LoadLibraryEx(path,IntPtr.Zero,0x1100)==IntPtr.Zero) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "Cannot load libwebp: "+path);
        int version=WebPGetEncoderVersion();
        return String.Format("{0}.{1}.{2}", version>>16, (version>>8)&255, version&255);
    }
    public static byte[] Encode(Bitmap image, float quality, bool lossless) {
        BitmapData data=image.LockBits(new Rectangle(0,0,image.Width,image.Height),ImageLockMode.ReadOnly,PixelFormat.Format24bppRgb);
        IntPtr output=IntPtr.Zero;
        try {
            UIntPtr size=lossless
                ? WebPEncodeLosslessBGR(data.Scan0,image.Width,image.Height,data.Stride,out output)
                : WebPEncodeBGR(data.Scan0,image.Width,image.Height,data.Stride,quality,out output);
            int length=checked((int)size.ToUInt64());
            if(length==0)throw new InvalidOperationException("WebP encoding failed");
            byte[] bytes=new byte[length];Marshal.Copy(output,bytes,0,length);return bytes;
        } finally { if(output!=IntPtr.Zero)WebPFree(output);image.UnlockBits(data); }
    }
    public static Bitmap Decode(byte[] bytes) {
        int width,height;
        IntPtr pixels=WebPDecodeBGRA(bytes,(UIntPtr)(uint)bytes.Length,out width,out height);
        if(pixels==IntPtr.Zero)throw new InvalidOperationException("WebP decoding failed");
        Bitmap image=new Bitmap(width,height,PixelFormat.Format32bppArgb);
        try {
            BitmapData data=image.LockBits(new Rectangle(0,0,width,height),ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb);
            try {
                byte[] row=new byte[width*4];
                for(int y=0;y<height;y++){
                    Marshal.Copy(IntPtr.Add(pixels,y*width*4),row,0,row.Length);
                    Marshal.Copy(row,0,IntPtr.Add(data.Scan0,y*data.Stride),row.Length);
                }
            } finally {image.UnlockBits(data);}
        } catch {image.Dispose();throw;}
        finally {WebPFree(pixels);}
        return image;
    }
    // Numerical differences supplement, rather than replace, visual review.
    public static double[] Compare(Bitmap original, Bitmap optimized) {
        if(original.Width!=optimized.Width||original.Height!=optimized.Height)throw new InvalidOperationException("Image dimensions changed");
        Rectangle rect=new Rectangle(0,0,original.Width,original.Height);
        BitmapData a=original.LockBits(rect,ImageLockMode.ReadOnly,PixelFormat.Format24bppRgb);
        BitmapData b=optimized.LockBits(rect,ImageLockMode.ReadOnly,PixelFormat.Format24bppRgb);
        double squared=0,absolute=0;int maximum=0;long count=(long)rect.Width*rect.Height*3;
        try {
            byte[] rowA=new byte[rect.Width*3],rowB=new byte[rect.Width*3];
            for(int y=0;y<rect.Height;y++){
                Marshal.Copy(IntPtr.Add(a.Scan0,y*a.Stride),rowA,0,rowA.Length);
                Marshal.Copy(IntPtr.Add(b.Scan0,y*b.Stride),rowB,0,rowB.Length);
                for(int x=0;x<rowA.Length;x++){int d=Math.Abs(rowA[x]-rowB[x]);squared+=d*d;absolute+=d;if(d>maximum)maximum=d;}
            }
        } finally {original.UnlockBits(a);optimized.UnlockBits(b);}
        return new double[]{squared==0?Double.PositiveInfinity:10*Math.Log10(255.0*255.0/(squared/count)),absolute/count,maximum};
    }
}
