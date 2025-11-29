import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generatePDF() {
  const htmlPath = join(__dirname, '../docs/ARCHITECTURE.html');
  const pdfPath = join(__dirname, '../docs/ARCHITECTURE.pdf');
  
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Read HTML and inject better styles
  let html = readFileSync(htmlPath, 'utf-8');
  
  // Add custom styles for PDF
  const customStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        line-height: 1.6;
        max-width: 900px;
        margin: 0 auto;
        padding: 40px;
        color: #24292e;
      }
      h1 { color: #0366d6; border-bottom: 2px solid #0366d6; padding-bottom: 10px; }
      h2 { color: #24292e; border-bottom: 1px solid #e1e4e8; padding-bottom: 8px; margin-top: 40px; }
      h3 { color: #586069; margin-top: 30px; }
      pre, code { background: #f6f8fa; border-radius: 6px; }
      pre { padding: 16px; overflow-x: auto; }
      code { padding: 2px 6px; }
      table { border-collapse: collapse; width: 100%; margin: 20px 0; }
      th, td { border: 1px solid #e1e4e8; padding: 10px 15px; text-align: left; }
      th { background: #f6f8fa; font-weight: 600; }
      tr:nth-child(even) { background: #fafbfc; }
      blockquote { border-left: 4px solid #0366d6; margin: 0; padding-left: 20px; color: #586069; }
      a { color: #0366d6; text-decoration: none; }
      hr { border: none; border-top: 1px solid #e1e4e8; margin: 30px 0; }
      #TOC { background: #f6f8fa; padding: 20px; border-radius: 6px; margin-bottom: 40px; }
      #TOC ul { list-style: none; padding-left: 20px; }
      #TOC > ul { padding-left: 0; }
      #TOC a { color: #0366d6; }
      @page { margin: 1in; }
    </style>
  `;
  
  html = html.replace('</head>', customStyles + '</head>');
  
  console.log('Loading HTML...');
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '1in', right: '0.75in', bottom: '1in', left: '0.75in' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%; color: #586069;">MarketplaceAI Architecture v1.0.0-only-avax - Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  });
  
  await browser.close();
  console.log(`✅ PDF generated: ${pdfPath}`);
}

generatePDF().catch(console.error);
