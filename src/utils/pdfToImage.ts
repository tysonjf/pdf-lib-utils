import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	'pdfjs-dist/build/pdf.worker.mjs',
	import.meta.url
).toString();

export async function pdfToImage(
	pdfInput: string | ArrayBuffer | Blob,
	pageNumber = 1
): Promise<string> {
	let loadingTask;
	if (typeof pdfInput === 'string') {
		loadingTask = pdfjs.getDocument(pdfInput);
	} else if (pdfInput instanceof Blob) {
		loadingTask = pdfjs.getDocument({ data: await pdfInput.arrayBuffer() });
	} else {
		loadingTask = pdfjs.getDocument({ data: pdfInput });
	}
	const doc = await loadingTask.promise;
	const page = await doc.getPage(pageNumber);
	const viewport = page.getViewport({ scale: 1 });
	const canvas = document.createElement('canvas');
	canvas.width = viewport.width;
	canvas.height = viewport.height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Could not get canvas context');
	const renderContext = { canvasContext: context, viewport };
	await page.render(renderContext).promise;
	return canvas.toDataURL('image/png');
}
