# @part-db/Html5-QRCode

This is a fork of the original [Html5-QRCode](https://github.com/mebjas/html5-qrcode) library by mebjas.

This fork is intended primary for the use in [Part-DB](https://github.com/Part-DB/Part-DB-server). The ZXing-JS dependency
was removed to save code. Everything is now decoded using the native Barcode Detector API. If your browser does not support it
you can use a polyfill like [barcode-detector](https://github.com/Sec-ant/barcode-detector), which uses a webasm version
of the big ZXing library and offers a much better performance and quality than the JS version.