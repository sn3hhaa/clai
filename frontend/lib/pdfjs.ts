// The single pdf.js instance (react-pdf's), with the worker served from /pdf.worker.min.mjs
// under the deployment base path. Parsing runs in that worker, off the main thread.
import { pdfjs } from "react-pdf";
import { asset } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = asset("/pdf.worker.min.mjs");

export { pdfjs };
