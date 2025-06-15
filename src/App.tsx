import { cmyk, PDFDocument } from '@cantoo/pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { useEffect, useState } from 'react';
import styles from './app.module.css';
import { drawQRCode } from './utils/draw-qr-code';
import { drawTextArea } from './utils/draw-text-area';
import { drawTextLine } from './utils/draw-text-line';
import { yFromTop } from './utils/metrics';
import { PathBuilder } from './utils/pathBuilder';
import { pdfToImage } from './utils/pdfToImage';

function App() {
	const [blobUrl, setBlobUrl] = useState<string | null>(null);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [textPartsIdx, setTextPartsIdx] = useState(0);
	const [alignIdx, setAlignIdx] = useState(0);

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

			drawTextArea(page, {
				parts: [
					{
						text: 'Hello World',
						font: EduHandFont,
						fontSize: 12,
					},
					{
						text: 'Hello World',
						font: EduHandFont,
						fontSize: 12,
						newLine: true,
					},
				],
				height: 150,
				width: 200,
				x: 20,
				y: 300,
				align: 'center',
				verticalAlign: 'middle',
				hideOnOverflow: false,
			});

			drawTextLine(page, {
				parts: [
					{
						text: 'Hello World',
						font: EduHandFont,
						fontSize: 12,
					},
				],
				x: 20,
				y: 300,
				width: 200,
				height: 150,
				align: 'justifyWords',
				verticalAlign: 'middle',
				hideOnOverflow: true,
				onOverflow: (info) => {
					console.log(info);
				},
				opacity: 1,
			});

			const image = await doc.embedPng(imgBytes);

			PathBuilder.ellipsePath(page, {
				x: 20,
				y: 30,
				xRadius: 200,
				yRadius: 150,
				stroke: cmyk(0, 1, 0, 0),
				strokeWidth: 4,
				strokeOpacity: 1,
				dashArray: [10, 10],
				dashPhase: 0,
			})
				.clip(({ page, left }) => {
					page.drawImage(image, {
						x: left,
						y: yFromTop(page, 30, 200),
						width: 200,
						height: 200,
						opacity: 1,
					});
				})
				.pushOperators();

			PathBuilder.rectPath(page, {
				x: 20,
				y: 30,
				width: 200,
				height: 150,
				radius: 10,
				stroke: cmyk(0, 0, 1, 1),
				strokeWidth: 4,
				strokeOpacity: 1,
			}).pushOperators();

			drawQRCode(page, {
				data: 'www.google.com',
				x: 30,
				y: 50,
				width: 200,
				height: 200,
				margin: 10,
				border: cmyk(1, 0, 0, 0),
				borderWidth: 2,
				background: cmyk(0, 0, 0, 1),
				foreground: cmyk(0, 1, 0, 0),
				radius: 10,
				forgroundRadius: 10,
			});

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
