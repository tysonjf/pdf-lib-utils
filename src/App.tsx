import { PDFDocument, popGraphicsState, rgb } from '@cantoo/pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { useEffect, useState } from 'react';
import styles from './app.module.css';
import {
	sampleTextOptions,
	sampleTextParts1,
	sampleTextParts2,
	sampleTextParts3,
	sampleTextParts4,
} from './test-data/text-area-data';
import { drawImageArea } from './utils/draw-image-area';
import { drawTextArea } from './utils/draw-text-area';
import { drawTextLine } from './utils/draw-text-line';
import { PathBuilder } from './utils/pathBuilder';
import { pdfToImage } from './utils/pdfToImage';

function App() {
	const [blobUrl, setBlobUrl] = useState<string | null>(null);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [textPartsIdx, setTextPartsIdx] = useState(0);
	const [alignIdx, setAlignIdx] = useState(0);

	const textPartsFns = [
		sampleTextParts1,
		sampleTextParts2,
		sampleTextParts3,
		sampleTextParts4,
	];

	useEffect(() => {
		async function main() {
			const doc = await PDFDocument.create();

			doc.registerFontkit(fontkit);
			const font = await fetch('/EduQLDHand-Bold.ttf').then((res) => res.arrayBuffer());
			const imgBytes = await fetch('/square.png').then((res) => res.arrayBuffer());
			const EduHandFont = await doc.embedFont(font, {
				customName: 'EduQLDHand-Bold',
			});
			// Larger page size for more test data
			const page = doc.addPage([300, 400]);
			const pageHeight = page.getHeight();
			const pageWidth = page.getWidth();

			// console.time('⏱️ Drawing Text Area');
			// drawTextArea(
			// 	page,
			// 	textPartsFns[textPartsIdx](EduHandFont),
			// 	20, // x (mm)
			// 	30, // y (mm)
			// 	pageWidth - 40, // width (mm)
			// 	pageHeight - 60, // height (mm)
			// 	sampleTextOptions[alignIdx],
			// 	true
			// );
			// console.timeEnd('⏱️ Drawing Text Area');

			// console.time('⏱️ Drawing Text Line');
			// drawTextLine(
			// 	page,
			// 	[
			// 		{
			// 			text: 'Hello World',
			// 			font: EduHandFont,
			// 			fontSize: 12,
			// 		},
			// 	],
			// 	20, // x (mm)
			// 	30, // y (mm)
			// 	pageWidth - 40, // width (mm)
			// 	20, // height (mm)
			// 	{
			// 		align: 'justifyWords',
			// 		verticalAlign: 'middle',
			// 		hideOnOverflow: true,
			// 		onOverflow: (info) => {
			// 			console.log(info);
			// 		},
			// 		color: rgb(0, 0, 0),
			// 		opacity: 1,
			// 	},
			// 	true
			// );
			// console.timeEnd('⏱️ Drawing Text Line');

			const image = await doc.embedPng(imgBytes);
			drawImageArea(page, image, 20, 50, 200, 150, {
				opacity: 1,
				clipShape: 'rect',
				// debug: true,
			});

			// // drawEllipse demo
			// const y = 70 + 40;
			// const x = 70 + 40;
			// page.pushOperators(...PathBuilder.ellipseClip(x, y, 70, 70));
			// // Draw the image within the clipping path
			// page.drawImage(image, {
			// 	x: 40,
			// 	y: pageHeight - 40,
			// 	width: 140,
			// 	height: 140,
			// 	opacity: 1,
			// });
			// page.drawEllipse({
			// 	x: x,
			// 	y: y,
			// 	xScale: 70,
			// 	yScale: 70,
			// 	borderColor: rgb(1, 1, 0),
			// 	borderOpacity: 1,
			// 	opacity: 1,
			// });
			// page.pushOperators(popGraphicsState());

			const pdfBytes = await doc.save();
			const blob = new Blob([pdfBytes], { type: 'application/pdf' });
			const blobUrl = URL.createObjectURL(blob);
			setBlobUrl(blobUrl);
			const imgUrl = await pdfToImage(pdfBytes);
			setImageUrl(imgUrl);
		}
		main();
		return () => {};
	}, [textPartsIdx, alignIdx]);

	return (
		<>
			<div className={styles.app}>
				<div style={{ marginBottom: 16 }}>
					<label>Text Data:&nbsp;</label>
					{['Sample 1', 'Sample 2', 'Sample 3', 'Sample 4'].map((label, idx) => (
						<button
							key={label}
							onClick={() => setTextPartsIdx(idx)}
							disabled={textPartsIdx === idx}
						>
							{label}
						</button>
					))}
					&nbsp;&nbsp;
					<label>Alignment:&nbsp;</label>
					{['Left', 'Center', 'Right', 'Justify Parts', 'Justify Words'].map(
						(label, idx) => (
							<button
								key={label}
								onClick={() => setAlignIdx(idx)}
								disabled={alignIdx === idx}
							>
								{label}
							</button>
						)
					)}
				</div>
				{blobUrl && (
					<a
						href={blobUrl}
						download='test.pdf'
						target='_blank'
						rel='noopener noreferrer'
						className={styles.downloadLink}
					>
						Download PDF
					</a>
				)}
				{imageUrl && (
					<a
						href={imageUrl}
						download='test.png'
						target='_blank'
						rel='noopener noreferrer'
						className={styles.downloadLink + ' ' + styles.downloadLinkPng}
					>
						Download PNG
					</a>
				)}
				<div className={styles.pdfContainer}>
					{blobUrl && (
						<div className={styles.pdfContainer}>
							<iframe src={blobUrl} width='100%' height='100%' />
						</div>
					)}
					{imageUrl && (
						<div className={styles.pdfContainer}>
							<img src={imageUrl} alt='PDF' style={{ width: '100%', height: 'auto' }} />
						</div>
					)}
				</div>
			</div>
		</>
	);
}

export default App;
