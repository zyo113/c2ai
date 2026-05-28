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
        {
          success: false,
          message: '请上传文件',
        },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: '仅支持 JPEG、JPG、PNG 格式',
        },
        { status: 400 }
      );
    }

    // 获取文件数据
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 使用sharp处理图片
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // 确保图片在合理范围内（优化处理性能）
    let processedImage = image;
    if (metadata.width && metadata.width > 2000) {
      processedImage = image.resize(2000, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    if (metadata.height && metadata.height > 2000) {
      processedImage = image.resize(undefined, 2000, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // 获取处理后的图片数据
    const { data, info } = await processedImage
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 转换为RGBA格式供imagetracer使用
    const rgbaData: number[] = [];
    for (let i = 0; i < data.length; i += 3) {
      rgbaData.push(data[i], data[i + 1], data[i + 2], 255);
    }

    // 使用ImageTracer转换为SVG
    const svgString = ImageTracer.imagedataToSVG(
      {
        data: rgbaData,
        width: info.width,
        height: info.height,
      },
      {
        ltres: 1,
        qtres: 1,
        pathomit: 8,
        rightangleenhance: true,
        colorsampling: 2,
        numberofcolors: 16,
        mincolorratio: 0,
        colorquantcycles: 3,
        scale: 1,
        simplify: 0,
        roundcoords: 1,
        lcpr: 0,
        qcpr: 0,
        desc: false,
        viewbox: true,
        blurradius: 0,
        blurdelta: 20,
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

// 生成Adobe Illustrator AI格式文件
function generateAIFormat(svgString: string, width: number, height: number): string {
  // AI文件是基于PDF格式的，但包含Adobe Illustrator的特殊标记
  // 这里我们生成一个兼容AI格式的PDF文件
  
  // 提取SVG中的路径信息
  const paths = extractPathsFromSVG(svgString);
  
  // 将SVG转换为PDF路径命令
  const pdfPaths = convertSVGPathsToPDF(paths, width, height);
  
  const timestamp = new Date().toISOString();
  
  // AI文件头部标记（Adobe Illustrator特有）
  const aiHeader = `%PDF-1.4
%AI-Adobe Illustrator 17.0
%%Creator: Image Vectorizer
%%CreationDate: ${timestamp}
%%BoundingBox: 0 0 ${width} ${height}
%%HiResBoundingBox: 0 0 ${width} ${height}
%%DocumentProcessColors: Black
%%AI5_FileFormat 4.0
%%AI8_BuildVersion: 17.0.0
`;

  // PDF对象结构
  const pdfObjects = `1 0 obj
<< /Type /Catalog /Pages 2 0 R /Creator (Adobe Illustrator 17.0) /Producer (Image Vectorizer) /CreationDate (${timestamp}) >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>
endobj

4 0 obj
<< /Length ${pdfPaths.length + 44} >>
stream
q ${width} 0 0 ${height} 0 0 cm ${pdfPaths} Q
endstream
endobj
`;

  // 创建一个包含矢量数据的内容对象
  const contentObject = `5 0 obj
<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 ${width} ${height}] /Group << /S /Transparency /CS /DeviceRGB >> /Resources << >> /Length ${pdfPaths.length} >>
stream
${pdfPaths}
endstream
endobj
`;

  // PDF交叉引用表
  const xrefOffset = aiHeader.length + pdfObjects.length + contentObject.length;
  
  const xref = `xref
0 6
0000000000 65535 f 
0000000031 00000 n 
0000000150 00000 n 
0000000206 00000 n 
0000000380 00000 n 
0000000476 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

  return aiHeader + pdfObjects + contentObject + xref;
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
  const pathRegex = /<path([^>]*)d="([^"]*)"[^>]*\/>/g;
  
  let match;
  while ((match = pathRegex.exec(svgString)) !== null) {
    const attributes = match[1];
    const d = match[2];
    
    // 提取属性
    const fillMatch = attributes.match(/fill="([^"]*)"/);
    const strokeMatch = attributes.match(/stroke="([^"]*)"/);
    const strokeWidthMatch = attributes.match(/stroke-width="([^"]*)"/);
    const opacityMatch = attributes.match(/opacity="([^"]*)"/);
    
    paths.push({
      fill: fillMatch ? fillMatch[1] : 'none',
      stroke: strokeMatch ? strokeMatch[1] : 'none',
      strokeWidth: strokeWidthMatch ? strokeWidthMatch[1] : '1',
      opacity: opacityMatch ? opacityMatch[1] : '1',
      d: d,
    });
  }
  
  return paths;
}

// 将SVG路径转换为PDF路径命令
function convertSVGPathsToPDF(paths: SVGPath[], width: number, height: number): string {
  let pdfContent = '';
  
  for (const path of paths) {
    // 设置填充颜色
    if (path.fill !== 'none') {
      const rgb = parseRGBColor(path.fill);
      pdfContent += `${rgb.r} ${rgb.g} ${rgb.b} rg `;
    }
    
    // 设置描边颜色
    if (path.stroke !== 'none') {
      const rgb = parseRGBColor(path.stroke);
      pdfContent += `${rgb.r} ${rgb.g} ${rgb.b} RG `;
      pdfContent += `${parseFloat(path.strokeWidth)} w `;
    }
    
    // 转换路径数据
    const pdfPath = convertSVGPathData(path.d, height);
    pdfContent += `${pdfPath} `;
    
    // 填充或描边
    if (path.fill !== 'none' && path.stroke !== 'none') {
      pdfContent += 'B ';
    } else if (path.fill !== 'none') {
      pdfContent += 'f ';
    } else if (path.stroke !== 'none') {
      pdfContent += 'S ';
    }
  }
  
  return pdfContent;
}

// 解析RGB颜色字符串
function parseRGBColor(colorStr: string): { r: number; g: number; b: number } {
  if (colorStr.startsWith('rgb(')) {
    const match = colorStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255,
      };
    }
  } else if (colorStr.startsWith('#')) {
    const hex = colorStr.substring(1);
    return {
      r: parseInt(hex.substring(0, 2), 16) / 255,
      g: parseInt(hex.substring(2, 4), 16) / 255,
      b: parseInt(hex.substring(4, 6), 16) / 255,
    };
  }
  
  // 默认黑色
  return { r: 0, g: 0, b: 0 };
}

// 将SVG路径数据转换为PDF路径命令
function convertSVGPathData(svgPath: string, height: number): string {
  const commands = svgPath.match(/[MLHVCSQTAZmlhvcsqtaz][^MLHVCSQTAZmlhvcsqtaz]*/g) || [];
  let pdfPath = '';
  let currentX = 0;
  let currentY = 0;
  
  for (const cmd of commands) {
    const type = cmd[0];
    const params = cmd.slice(1).trim().split(/[\s,]+/).filter(p => p).map(parseFloat);
    
    switch (type) {
      case 'M':
        // 移动到绝对坐标
        currentX = params[0];
        currentY = height - params[1]; // PDF坐标系Y轴向上
        pdfPath += `${currentX} ${currentY} m `;
        break;
      
      case 'L':
        // 直线到绝对坐标
        currentX = params[0];
        currentY = height - params[1];
        pdfPath += `${currentX} ${currentY} l `;
        break;
      
      case 'H':
        // 水平线到绝对X坐标
        currentX = params[0];
        pdfPath += `${currentX} ${currentY} l `;
        break;
      
      case 'V':
        // 垂直线到绝对Y坐标
        currentY = height - params[0];
        pdfPath += `${currentX} ${currentY} l `;
        break;
      
      case 'C':
        // 贝塞尔曲线（绝对坐标）
        const x1 = params[0];
        const y1 = height - params[1];
        const x2 = params[2];
        const y2 = height - params[3];
        currentX = params[4];
        currentY = height - params[5];
        pdfPath += `${x1} ${y1} ${x2} ${y2} ${currentX} ${currentY} c `;
        break;
      
      case 'Z':
      case 'z':
        // 关闭路径
        pdfPath += 'h ';
        break;
      
      // 其他命令可以继续扩展
      default:
        break;
    }
  }
  
  return pdfPath;
}