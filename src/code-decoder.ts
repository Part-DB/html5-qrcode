/**
 * @fileoverview
 * Shim layer for providing the decoding library.
 * 
 * @author mebjas <minhazav@gmail.com>
 * 
 * The word "QR Code" is registered trademark of DENSO WAVE INCORPORATED
 * http://www.denso-wave.com/qrcode/faqpatent-e.html
 */

import {
    QrcodeResult,
    Html5QrcodeSupportedFormats,
    Logger,
    QrcodeDecoderAsync,
    RobustQrcodeDecoderAsync,
} from "./core";

import { BarcodeDetectorDelegate } from "./native-bar-code-detector";

/**
 * Shim layer for {@interface QrcodeDecoder}.
 * 
 * Currently uses {@class ZXingHtml5QrcodeDecoder}, can be replace with another library.
 */
export class Html5QrcodeShim implements RobustQrcodeDecoderAsync {
    
    private verbose: boolean;
    private primaryDecoder: QrcodeDecoderAsync;
    private secondaryDecoder: QrcodeDecoderAsync | undefined;

    private readonly EXECUTIONS_TO_REPORT_PERFORMANCE = 100;
    private executions: number = 0;
    private executionResults: Array<number> = [];
    private wasPrimaryDecoderUsedInLastDecode = false;

    public constructor(
        requestedFormats: Array<Html5QrcodeSupportedFormats>,
        verbose: boolean,
        logger: Logger) {
        this.verbose = verbose;

        //If native BarcodeDetector is supported, use it as primary decoder and polyfill as secondary.
        if (BarcodeDetectorDelegate.isNativeSupported()) {
            logger.log("Native BarcodeDetector is supported, using it as primary decoder.");

            this.primaryDecoder = new BarcodeDetectorDelegate(
                requestedFormats, verbose, logger);
            this.secondaryDecoder = new BarcodeDetectorDelegate(
                requestedFormats, verbose, logger, true);
        } else { //Otherwise use polyfill as primary decoder.
            logger.log("Native BarcodeDetector is not supported, using polyfill as primary decoder.");

            this.primaryDecoder = new BarcodeDetectorDelegate(
                requestedFormats, verbose, logger, true);
        }
    }

    async decodeAsync(canvas: HTMLCanvasElement): Promise<QrcodeResult> {
        let startTime = performance.now();
        try {
            return await this.getDecoder().decodeAsync(canvas);
        } finally {
            this.possiblyLogPerformance(startTime);
        }
    }

    async decodeRobustlyAsync(canvas: HTMLCanvasElement)
        : Promise<QrcodeResult> {
        let startTime = performance.now();
        try {
            return await this.primaryDecoder.decodeAsync(canvas);
        } catch(error) {
            if (this.secondaryDecoder) {
                // Try fallback.
                return this.secondaryDecoder.decodeAsync(canvas);
            }
            throw error;
        } finally {
            this.possiblyLogPerformance(startTime);
        }
    }

    private getDecoder(): QrcodeDecoderAsync {
        if (!this.secondaryDecoder) {
            return this.primaryDecoder;
        }

        if (this.wasPrimaryDecoderUsedInLastDecode === false) {
            this.wasPrimaryDecoderUsedInLastDecode = true;
            return this.primaryDecoder;
        }
        this.wasPrimaryDecoderUsedInLastDecode = false;
        return this.secondaryDecoder;
    }

    private possiblyLogPerformance(startTime: number) {
        if (!this.verbose) {
            return;
        }
        let executionTime = performance.now() - startTime;
        this.executionResults.push(executionTime);
        this.executions++;
        this.possiblyFlushPerformanceReport();
    }

    // Dumps mean decoding latency to console for last
    // EXECUTIONS_TO_REPORT_PERFORMANCE runs.
    // TODO(mebjas): Can we automate instrumentation runs?
    possiblyFlushPerformanceReport() {
        if (this.executions < this.EXECUTIONS_TO_REPORT_PERFORMANCE) {
            return;
        }

        let sum:number = 0;
        for (let executionTime of this.executionResults) {
            sum += executionTime;
        }
        let mean = sum / this.executionResults.length;
        // eslint-disable-next-line no-console
        console.log(`${mean} ms for ${this.executionResults.length} last runs.`);
        this.executions = 0;
        this.executionResults = [];
    }
}
