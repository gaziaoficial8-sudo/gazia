import {mkdir,copyFile,readdir} from 'node:fs/promises';
await mkdir('public/ocr/core',{recursive:true});await mkdir('public/ocr/lang',{recursive:true});
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
for(const file of await readdir('node_modules/tesseract.js-core'))if(file.endsWith('.wasm.js'))await copyFile('node_modules/tesseract.js-core/'+file,'public/ocr/core/'+file);
await copyFile('node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz','public/ocr/lang/por.traineddata.gz');
await copyFile('node_modules/tesseract.js-core/LICENSE','public/ocr/LICENSE-core.txt');
await copyFile('node_modules/tesseract.js/LICENSE.md','public/ocr/LICENSE-tesseract.txt');
console.log('OCR worker, core and Portuguese model prepared on own origin.');
