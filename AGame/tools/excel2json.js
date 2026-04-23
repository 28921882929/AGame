// tools/excel2json.js
/**
 * Excel 转 JSON 工具
 *
 * 使用方法：
 * 1. npm install xlsx
 * 2. node tools/excel2json.js
 *
 * 输入：tools/excel/*.xlsx
 * 输出：assets/Config/*.json
 *
 * Excel 格式：
 * - 第一行：字段名
 * - 第二行：字段类型（可选，作为注释）
 * - 第三行开始：数据
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// 配置
const CONFIG = {
    inputDir: path.join(__dirname, 'excel'),
    outputDir: path.join(__dirname, '../assets/Config'),
    excludeSheets: ['说明', 'Sheet1'],  // 排除的Sheet名
};

/**
 * 读取Excel文件
 */
function readExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const result = {};

    workbook.SheetNames.forEach(sheetName => {
        if (CONFIG.excludeSheets.includes(sheetName)) return;

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (data.length < 2) return;

        // 第一行是字段名
        const headers = data[0];
        // 第二行是类型注释（跳过）
        // 从第三行开始是数据
        const rows = data.slice(2);

        const items = {};
        const itemsArray = [];

        rows.forEach(row => {
            const item = {};
            headers.forEach((header, index) => {
                if (header) {
                    let value = row[index];
                    // 尝试转换类型
                    if (typeof value === 'string') {
                        // 尝试解析数字
                        if (/^\d+$/.test(value)) {
                            value = parseInt(value, 10);
                        } else if (/^\d+\.\d+$/.test(value)) {
                            value = parseFloat(value);
                        }
                    }
                    item[header] = value;
                }
            });

            // 使用 id 作为键（如果存在）
            if (item.id !== undefined) {
                items[item.id] = item;
            }
            itemsArray.push(item);
        });

        result[sheetName] = { items, data: itemsArray };
    });

    return result;
}

/**
 * 写入JSON文件
 */
function writeJson(filePath, data) {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, json, 'utf8');
    console.log(`[OK] ${path.basename(filePath)}`);
}

/**
 * 主函数
 */
function main() {
    console.log('=== Excel to JSON Converter ===\n');

    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // 检查输入目录
    if (!fs.existsSync(CONFIG.inputDir)) {
        console.log(`[WARN] Input directory not found: ${CONFIG.inputDir}`);
        console.log('[INFO] Creating input directory...');
        fs.mkdirSync(CONFIG.inputDir, { recursive: true });
        console.log('[INFO] Please put your Excel files in tools/excel/');
        return;
    }

    // 读取所有Excel文件
    const files = fs.readdirSync(CONFIG.inputDir)
        .filter(file => file.endsWith('.xlsx') && !file.startsWith('~'));

    if (files.length === 0) {
        console.log('[WARN] No Excel files found in tools/excel/');
        return;
    }

    console.log(`Found ${files.length} Excel file(s):\n`);

    files.forEach(file => {
        const filePath = path.join(CONFIG.inputDir, file);
        console.log(`Processing: ${file}`);

        try {
            const data = readExcel(filePath);

            // 为每个Sheet生成JSON
            Object.keys(data).forEach(sheetName => {
                const outputPath = path.join(CONFIG.outputDir, `${sheetName}.json`);
                writeJson(outputPath, data[sheetName]);
            });
        } catch (e) {
            console.error(`[ERROR] Failed to process ${file}:`, e.message);
        }
    });

    console.log('\n=== Conversion completed ===');
}

// 运行
main();