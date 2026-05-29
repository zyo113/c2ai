import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import ImageTracer from 'imagetracerjs';

interface ConversionResult {
  success: boolean;
  message: string;
  downloadUrl?: string;
  filename?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ConversionResult>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const format = formData.get('format') as string | 'svg';

    if (!file) {
      return NextResponse.json(
        { success: false, message: '请上传文件' },
        { status: 400 }
      );
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: '仅支持 JPEG、JPG、PNG 格式' },
        { status: 400 }
      );
    }

    // 转换文件为Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 使用sharp处理图片
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // 如果图片太大，适当缩放以提高转换效率
    let processedImage = image;
    const maxSize = 2000;
    if (metadata.width && metadata.width > maxSize) {
      processedImage = image.resize(maxSize, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    if (metadata.height && metadata.height > maxSize) {
      processedImage = image.resize(undefined, maxSize, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // 获取图片数据并转换为RGBA格式
    const { data, info } = await processedImage
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // 确保是RGB格式，白色背景
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 转换为RGBA数组（ImageTracer需要RGBA格式）
    const rgbaData: number[] = [];
    for (let i = 0; i < data.length; i += 3) {
      rgbaData.push(data[i], data[i + 1], data[i + 2], 255);
    }

    // 使用ImageTracer转换为SVG（使用优化参数提高质量）
    const svgString = ImageTracer.imagedataToSVG(
      {
        data: rgbaData,
        width: info.width,
        height: info.height,
      },
      {
        // 核心参数优化 - 提高质量
        ltres: 0.5, // 降低直线误差阈值，提高精度
        qtres: 0.5, // 降低曲线误差阈值，提高精度
        pathomit: 4, // 降低最小路径长度，保留更多细节
        rightangleenhance: true,
        
        // 颜色参数优化
        colorsampling: 0, // 使用确定性采样，避免随机性导致的颜色失真
        numberofcolors: 128, // 增加颜色数量到128，大幅提高色彩保真度
        mincolorratio: 0,
        colorquantcycles: 3,
        
        // 其他参数
        scale: 1,
        simplify: 0, // 不简化路径，保留所有细节
        roundcoords: 3, // 提高坐标精度到3位小数，大幅减少模糊
        lcpr: 0,
        qcpr: 0,
        desc: false,
        viewbox: true,
        blurradius: 0, // 不模糊
        blurdelta: 10, // 降低模糊阈值
      }
    );

    // 生成文件名
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const filename = `${originalName}_converted.${format === 'ai' ? 'ai' : 'svg'}`;

    // 根据格式生成输出
    if (format === 'ai') {
      // 生成AI格式文件（Adobe Illustrator格式）
      const aiContent = generateAIFormat(svgString, info.width, info.height);
      const aiBuffer = Buffer.from(aiContent);
      const base64 = aiBuffer.toString('base64');

      return NextResponse.json({
        success: true,
        message: '转换成功！文件已自动下载',
        downloadUrl: `data:application/octet-stream;base64,${base64}`,
        filename,
      });
    } else {
      // SVG格式
      const svgBuffer = Buffer.from(svgString);
      const base64 = svgBuffer.toString('base64');

      return NextResponse.json({
        success: true,
        message: '转换成功！文件已自动下载',
        downloadUrl: `data:image/svg+xml;base64,${base64}`,
        filename,
      });
    }
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '转换失败，请重试',
      },
      { status: 500 }
    );
  }
}

// 生成Adobe Illustrator AI格式文件（基于PDF规范）
function generateAIFormat(svgString: string, width: number, height: number): string {
  // 提取SVG中的路径信息
  const paths = extractPathsFromSVG(svgString);
  
  // 将SVG转换为PDF路径命令
  const pdfPathContent = convertSVGPathsToPDF(paths, width, height);
  
  const timestamp = new Date().toISOString();
  
  // 构建PDF对象
  // 对象1：Catalog
  const obj1 = `1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj\n`;

  // 对象2：Pages
  const obj2 = `2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj\n`;

  // 对象3：Page
  const obj3 = `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << >> >>
endobj\n`;

  // 对象4：Content Stream - 包含矢量路径
  const contentStream = `q\n${pdfPathContent}\nQ`;
  const streamLength = contentStream.length;
  const obj4 = `4 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj\n`;

  // 计算每个对象的字节偏移量
  const offset1 = 0;
  const offset2 = offset1 + obj1.length;
  const offset3 = offset2 + obj2.length;
  const offset4 = offset3 + obj3.length;

  // PDF头部 + AI标记
  const header = `%PDF-1.4
%AI-Adobe Illustrator 17.0
%%Creator: Image Vectorizer
%%CreationDate: ${timestamp}
%%BoundingBox: 0 0 ${width} ${height}
%%HiResBoundingBox: 0 0 ${width} ${height}
%%AI5_FileFormat 4.0
%%AI8_BuildVersion: 17.0.0
`;

  // PDF主体
  const body = obj1 + obj2 + obj3 + obj4;

  // 交叉引用表
  const xrefOffset = header.length + body.length;
  const xref = `xref
0 5
0000000000 65535 f 
${String(offset1).padStart(10, '0')} 00000 n 
${String(offset2).padStart(10, '0')} 00000 n 
${String(offset3).padStart(10, '0')} 00000 n 
${String(offset4).padStart(10, '0')} 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

  return header + body + xref;
}

// 从SVG字符串中提取路径信息
interface SVGPath {
  fill: string;
  stroke: string;
  strokeWidth: string;
  opacity: string;
  d: string;
}

function extractPathsFromSVG(svgString: string): SVGPath[] {
  const paths: SVGPath[] = [];
  const pathRegex = /<path([^>]*)\/>/g;
  
  let match;
  while ((match = pathRegex.exec(svgString)) !== null) {
    const attributes = match[1];
    
    // 提取属性
    const dMatch = attributes.match(/d="([^"]*)"/);
    const fillMatch = attributes.match(/fill="([^"]*)"/);
    const strokeMatch = attributes.match(/stroke="([^"]*)"/);
    const strokeWidthMatch = attributes.match(/stroke-width="([^"]*)"/);
    const opacityMatch = attributes.match(/opacity="([^"]*)"/);
    
    if (dMatch) {
      paths.push({
        d: dMatch[1],
        fill: fillMatch ? fillMatch[1] : 'none',
        stroke: strokeMatch ? strokeMatch[1] : 'none',
        strokeWidth: strokeWidthMatch ? strokeWidthMatch[1] : '1',
        opacity: opacityMatch ? opacityMatch[1] : '1',
      });
    }
  }
  
  return paths;
}

// 将SVG路径转换为PDF路径命令
function convertSVGPathsToPDF(paths: SVGPath[], width: number, height: number): string {
  let pdfContent = '';
  
  for (const path of paths) {
    // 设置填充颜色（使用RGB颜色空间）
    if (path.fill !== 'none') {
      const rgb = parseRGBColor(path.fill);
      // PDF使用0-1范围的RGB值
      pdfContent += `${rgb.r.toFixed(3)} ${rgb.g.toFixed(3)} ${rgb.b.toFixed(3)} rg\n`;
    }
    
    // 设置描边颜色和宽度
    if (path.stroke !== 'none') {
      const rgb = parseRGBColor(path.stroke);
      pdfContent += `${rgb.r.toFixed(3)} ${rgb.g.toFixed(3)} ${rgb.b.toFixed(3)} RG\n`;
      pdfContent += `${parseFloat(path.strokeWidth).toFixed(1)} w\n`;
    }
    
    // 转换SVG路径数据为PDF路径
    const pdfPath = convertSVGPathDataToPDF(path.d, width, height);
    pdfContent += pdfPath + '\n';
    
    // 绘制路径
    if (path.fill !== 'none' && path.stroke !== 'none') {
      pdfContent += 'B\n'; // 填充并描边
    } else if (path.fill !== 'none') {
      pdfContent += 'f\n'; // 仅填充
    } else if (path.stroke !== 'none') {
      pdfContent += 'S\n'; // 仅描边
    }
  }
  
  return pdfContent;
}

// 解析颜色字符串为RGB值（0-1范围）
function parseRGBColor(colorStr: string): { r: number; g: number; b: number } {
  // 处理rgb()格式
  if (colorStr.startsWith('rgb(')) {
    const match = colorStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255,
      };
    }
  }
  
  // 处理十六进制格式
  if (colorStr.startsWith('#')) {
    const hex = colorStr.substring(1);
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16) / 255,
        g: parseInt(hex.substring(2, 4), 16) / 255,
        b: parseInt(hex.substring(4, 6), 16) / 255,
      };
    }
  }
  
  // 默认黑色
  return { r: 0, g: 0, b: 0 };
}

// 将SVG路径数据转换为PDF路径命令
function convertSVGPathDataToPDF(svgPath: string, width: number, height: number): string {
  // 解析SVG路径命令
  const commands = svgPath.match(/[MLHVCSQTAZmlhvcsqtaz][^MLHVCSQTAZmlhvcsqtaz]*/g) || [];
  let pdfPath = '';
  let currentX = 0;
  let currentY = 0;
  
  for (const cmd of commands) {
    const type = cmd[0];
    const params = cmd.slice(1).trim().split(/[\s,]+/).filter(p => p).map(parseFloat);
    
    switch (type) {
      // 移动命令
      case 'M':
        currentX = params[0];
        currentY = height - params[1]; // Y轴翻转
        pdfPath += `${currentX.toFixed(3)} ${currentY.toFixed(3)} m `;
        break;
      
      // 直线命令
      case 'L':
        currentX = params[0];
        currentY = height - params[1];
        pdfPath += `${currentX.toFixed(3)} ${currentY.toFixed(3)} l `;
        break;
      
      case 'H':
        currentX = params[0];
        pdfPath += `${currentX.toFixed(3)} ${currentY.toFixed(3)} l `;
        break;
      
      case 'V':
        currentY = height - params[0];
        pdfPath += `${currentX.toFixed(3)} ${currentY.toFixed(3)} l `;
        break;
      
      // 曲线命令
      case 'C':
        const x1 = params[0];
        const y1 = height - params[1];
        const x2 = params[2];
        const y2 = height - params[3];
        currentX = params[4];
        currentY = height - params[5];
        pdfPath += `${x1.toFixed(3)} ${y1.toFixed(3)} ${x2.toFixed(3)} ${y2.toFixed(3)} ${currentX.toFixed(3)} ${currentY.toFixed(3)} c `;
        break;
      
      // 关闭路径
      case 'Z':
      case 'z':
        pdfPath += 'h ';
        break;
      
      default:
        break;
    }
  }
  
  return pdfPath;
}