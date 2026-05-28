'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface ConversionResult {
  success: boolean;
  message: string;
  downloadUrl?: string;
  filename?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [format, setFormat] = useState<string>('svg');
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(selectedFile.type)) {
      alert('请选择 JPEG、JPG 或 PNG 格式的图片');
      return;
    }

    setFile(selectedFile);
    setResult(null);

    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleConvert = async () => {
    if (!file) return;

    setConverting(true);
    setProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);

      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data: ConversionResult = await response.json();
      setResult(data);

      // 自动下载
      if (data.success && data.downloadUrl) {
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || 'converted.svg';
        link.click();
      }
    } catch (error) {
      console.error('Conversion error:', error);
      setResult({
        success: false,
        message: '转换失败，请重试',
      });
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 标题区 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            图片转矢量格式工具
          </h1>
          <p className="text-gray-600">
            将 JPEG、JPG、PNG 格式的位图转换为 SVG 或 AI 矢量格式
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 上传区域 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">1. 上传图片</h2>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    handleFileSelect(selectedFile);
                  }
                }}
              />
              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg shadow-md"
                  />
                  <p className="text-sm text-gray-600">{file?.name}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📁</div>
                  <p className="text-gray-600">
                    拖拽图片到这里，或点击选择文件
                  </p>
                  <p className="text-sm text-gray-400">
                    支持 JPEG、JPG、PNG 格式
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* 转换选项 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">2. 转换选项</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="format">输出格式</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger id="format" className="mt-2">
                    <SelectValue placeholder="选择输出格式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="svg">SVG (矢量图)</SelectItem>
                    <SelectItem value="ai">AI (Adobe Illustrator)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button
                  className="w-full"
                  onClick={handleConvert}
                  disabled={!file || converting}
                >
                  {converting ? '转换中...' : '开始转换'}
                </Button>
              </div>

              {converting && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-gray-600 text-center">
                    正在处理... {progress}%
                  </p>
                </div>
              )}

              {result && (
                <div
                  className={`p-4 rounded-lg ${
                    result.success
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  <p className="font-medium">{result.message}</p>
                  {result.success && result.downloadUrl && (
                    <a
                      href={result.downloadUrl}
                      download={result.filename}
                      className="inline-block mt-2 text-blue-600 hover:underline"
                    >
                      如果没有自动下载，点击这里下载
                    </a>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 使用说明 */}
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold mb-4">使用说明</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>矢量转换原理：</strong>
              将位图图像转换为矢量图形，通过边缘检测和路径追踪算法，
              将像素点转换为数学路径，实现无损缩放。
            </p>
            <p>
              <strong>适用场景：</strong>
              Logo设计、图标制作、印刷品、需要放大使用的图像。
            </p>
            <p>
              <strong>注意事项：</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>图像越简单、对比度越高，转换效果越好</li>
              <li>复杂照片转换后可能体积较大</li>
              <li>建议先对图像进行预处理，提高对比度</li>
              <li>SVG格式适合网页使用，AI格式适合专业设计软件</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}