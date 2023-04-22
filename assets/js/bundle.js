(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){(function (){
'use strict';

var possibleNames = [
	'BigInt64Array',
	'BigUint64Array',
	'Float32Array',
	'Float64Array',
	'Int16Array',
	'Int32Array',
	'Int8Array',
	'Uint16Array',
	'Uint32Array',
	'Uint8Array',
	'Uint8ClampedArray'
];

var g = typeof globalThis === 'undefined' ? global : globalThis;

module.exports = function availableTypedArrays() {
	var out = [];
	for (var i = 0; i < possibleNames.length; i++) {
		if (typeof g[possibleNames[i]] === 'function') {
			out[out.length] = possibleNames[i];
		}
	}
	return out;
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],4:[function(require,module,exports){
arguments[4][1][0].apply(exports,arguments)
},{"dup":1}],5:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":3,"buffer":5,"ieee754":20}],6:[function(require,module,exports){
module.exports = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}

},{}],7:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var callBind = require('./');

var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

module.exports = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
		return callBind(intrinsic);
	}
	return intrinsic;
};

},{"./":8,"get-intrinsic":13}],8:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var GetIntrinsic = require('get-intrinsic');

var $apply = GetIntrinsic('%Function.prototype.apply%');
var $call = GetIntrinsic('%Function.prototype.call%');
var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);
var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
var $max = GetIntrinsic('%Math.max%');

if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = null;
	}
}

module.exports = function callBind(originalFunction) {
	var func = $reflectApply(bind, $call, arguments);
	if ($gOPD && $defineProperty) {
		var desc = $gOPD(func, 'length');
		if (desc.configurable) {
			// original length, plus the receiver, minus any additional arguments (after the receiver)
			$defineProperty(
				func,
				'length',
				{ value: 1 + $max(0, originalFunction.length - (arguments.length - 1)) }
			);
		}
	}
	return func;
};

var applyBind = function applyBind() {
	return $reflectApply(bind, $apply, arguments);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}

},{"function-bind":12,"get-intrinsic":13}],9:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}],10:[function(require,module,exports){
'use strict';

var isCallable = require('is-callable');

var toStr = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
                iterator(array[i], i, array);
            } else {
                iterator.call(receiver, array[i], i, array);
            }
        }
    }
};

var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        if (receiver == null) {
            iterator(string.charAt(i), i, string);
        } else {
            iterator.call(receiver, string.charAt(i), i, string);
        }
    }
};

var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
                iterator(object[k], k, object);
            } else {
                iterator.call(receiver, object[k], k, object);
            }
        }
    }
};

var forEach = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
        throw new TypeError('iterator must be a function');
    }

    var receiver;
    if (arguments.length >= 3) {
        receiver = thisArg;
    }

    if (toStr.call(list) === '[object Array]') {
        forEachArray(list, iterator, receiver);
    } else if (typeof list === 'string') {
        forEachString(list, iterator, receiver);
    } else {
        forEachObject(list, iterator, receiver);
    }
};

module.exports = forEach;

},{"is-callable":23}],11:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],12:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":11}],13:[function(require,module,exports){
'use strict';

var undefined;

var $SyntaxError = SyntaxError;
var $Function = Function;
var $TypeError = TypeError;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD = Object.getOwnPropertyDescriptor;
if ($gOPD) {
	try {
		$gOPD({}, '');
	} catch (e) {
		$gOPD = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = require('has-symbols')();

var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols ? getProto([][Symbol.iterator]()) : undefined,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined : BigInt,
	'%BigInt64Array%': typeof BigInt64Array === 'undefined' ? undefined : BigInt64Array,
	'%BigUint64Array%': typeof BigUint64Array === 'undefined' ? undefined : BigUint64Array,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': RangeError,
	'%ReferenceError%': ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols ? getProto(''[Symbol.iterator]()) : undefined,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%URIError%': URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet
};

try {
	null.error; // eslint-disable-line no-unused-expressions
} catch (e) {
	// https://github.com/tc39/proposal-shadowrealm/pull/384#issuecomment-1364264229
	var errorProto = getProto(getProto(e));
	INTRINSICS['%Error.prototype%'] = errorProto;
}

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen) {
			value = getProto(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = require('function-bind');
var hasOwn = require('has');
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);
var $exec = bind.call(Function.call, RegExp.prototype.exec);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	if ($exec(/^%?[^%]*%?$/, name) === null) {
		throw new $SyntaxError('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
	}
	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined;
			}
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};

},{"function-bind":12,"has":18,"has-symbols":15}],14:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);

if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

module.exports = $gOPD;

},{"get-intrinsic":13}],15:[function(require,module,exports){
'use strict';

var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = require('./shams');

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

},{"./shams":16}],16:[function(require,module,exports){
'use strict';

/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

},{}],17:[function(require,module,exports){
'use strict';

var hasSymbols = require('has-symbols/shams');

module.exports = function hasToStringTagShams() {
	return hasSymbols() && !!Symbol.toStringTag;
};

},{"has-symbols/shams":16}],18:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":12}],19:[function(require,module,exports){
var http = require('http')
var url = require('url')

var https = module.exports

for (var key in http) {
  if (http.hasOwnProperty(key)) https[key] = http[key]
}

https.request = function (params, cb) {
  params = validateParams(params)
  return http.request.call(this, params, cb)
}

https.get = function (params, cb) {
  params = validateParams(params)
  return http.get.call(this, params, cb)
}

function validateParams (params) {
  if (typeof params === 'string') {
    params = url.parse(params)
  }
  if (!params.protocol) {
    params.protocol = 'https:'
  }
  if (params.protocol !== 'https:') {
    throw new Error('Protocol "' + params.protocol + '" not supported. Expected "https:"')
  }
  return params
}

},{"http":34,"url":55}],20:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],21:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],22:[function(require,module,exports){
'use strict';

var hasToStringTag = require('has-tostringtag/shams')();
var callBound = require('call-bind/callBound');

var $toString = callBound('Object.prototype.toString');

var isStandardArguments = function isArguments(value) {
	if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
		return false;
	}
	return $toString(value) === '[object Arguments]';
};

var isLegacyArguments = function isArguments(value) {
	if (isStandardArguments(value)) {
		return true;
	}
	return value !== null &&
		typeof value === 'object' &&
		typeof value.length === 'number' &&
		value.length >= 0 &&
		$toString(value) !== '[object Array]' &&
		$toString(value.callee) === '[object Function]';
};

var supportsStandardArguments = (function () {
	return isStandardArguments(arguments);
}());

isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;

},{"call-bind/callBound":7,"has-tostringtag/shams":17}],23:[function(require,module,exports){
'use strict';

var fnToStr = Function.prototype.toString;
var reflectApply = typeof Reflect === 'object' && Reflect !== null && Reflect.apply;
var badArrayLike;
var isCallableMarker;
if (typeof reflectApply === 'function' && typeof Object.defineProperty === 'function') {
	try {
		badArrayLike = Object.defineProperty({}, 'length', {
			get: function () {
				throw isCallableMarker;
			}
		});
		isCallableMarker = {};
		// eslint-disable-next-line no-throw-literal
		reflectApply(function () { throw 42; }, null, badArrayLike);
	} catch (_) {
		if (_ !== isCallableMarker) {
			reflectApply = null;
		}
	}
} else {
	reflectApply = null;
}

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var objectClass = '[object Object]';
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var ddaClass = '[object HTMLAllCollection]'; // IE 11
var ddaClass2 = '[object HTML document.all class]';
var ddaClass3 = '[object HTMLCollection]'; // IE 9-10
var hasToStringTag = typeof Symbol === 'function' && !!Symbol.toStringTag; // better: use `has-tostringtag`

var isIE68 = !(0 in [,]); // eslint-disable-line no-sparse-arrays, comma-spacing

var isDDA = function isDocumentDotAll() { return false; };
if (typeof document === 'object') {
	// Firefox 3 canonicalizes DDA to undefined when it's not accessed directly
	var all = document.all;
	if (toStr.call(all) === toStr.call(document.all)) {
		isDDA = function isDocumentDotAll(value) {
			/* globals document: false */
			// in IE 6-8, typeof document.all is "object" and it's truthy
			if ((isIE68 || !value) && (typeof value === 'undefined' || typeof value === 'object')) {
				try {
					var str = toStr.call(value);
					return (
						str === ddaClass
						|| str === ddaClass2
						|| str === ddaClass3 // opera 12.16
						|| str === objectClass // IE 6-8
					) && value('') == null; // eslint-disable-line eqeqeq
				} catch (e) { /**/ }
			}
			return false;
		};
	}
}

module.exports = reflectApply
	? function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		try {
			reflectApply(value, null, badArrayLike);
		} catch (e) {
			if (e !== isCallableMarker) { return false; }
		}
		return !isES6ClassFn(value) && tryFunctionObject(value);
	}
	: function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		if (hasToStringTag) { return tryFunctionObject(value); }
		if (isES6ClassFn(value)) { return false; }
		var strClass = toStr.call(value);
		if (strClass !== fnClass && strClass !== genClass && !(/^\[object HTML/).test(strClass)) { return false; }
		return tryFunctionObject(value);
	};

},{}],24:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;
var fnToStr = Function.prototype.toString;
var isFnRegex = /^\s*(?:function)?\*/;
var hasToStringTag = require('has-tostringtag/shams')();
var getProto = Object.getPrototypeOf;
var getGeneratorFunc = function () { // eslint-disable-line consistent-return
	if (!hasToStringTag) {
		return false;
	}
	try {
		return Function('return function*() {}')();
	} catch (e) {
	}
};
var GeneratorFunction;

module.exports = function isGeneratorFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
	}
	if (isFnRegex.test(fnToStr.call(fn))) {
		return true;
	}
	if (!hasToStringTag) {
		var str = toStr.call(fn);
		return str === '[object GeneratorFunction]';
	}
	if (!getProto) {
		return false;
	}
	if (typeof GeneratorFunction === 'undefined') {
		var generatorFunc = getGeneratorFunc();
		GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
	}
	return getProto(fn) === GeneratorFunction;
};

},{"has-tostringtag/shams":17}],25:[function(require,module,exports){
(function (global){(function (){
'use strict';

var forEach = require('for-each');
var availableTypedArrays = require('available-typed-arrays');
var callBound = require('call-bind/callBound');

var $toString = callBound('Object.prototype.toString');
var hasToStringTag = require('has-tostringtag/shams')();
var gOPD = require('gopd');

var g = typeof globalThis === 'undefined' ? global : globalThis;
var typedArrays = availableTypedArrays();

var $indexOf = callBound('Array.prototype.indexOf', true) || function indexOf(array, value) {
	for (var i = 0; i < array.length; i += 1) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
};
var $slice = callBound('String.prototype.slice');
var toStrTags = {};
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		if (Symbol.toStringTag in arr) {
			var proto = getPrototypeOf(arr);
			var descriptor = gOPD(proto, Symbol.toStringTag);
			if (!descriptor) {
				var superProto = getPrototypeOf(proto);
				descriptor = gOPD(superProto, Symbol.toStringTag);
			}
			toStrTags[typedArray] = descriptor.get;
		}
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var anyTrue = false;
	forEach(toStrTags, function (getter, typedArray) {
		if (!anyTrue) {
			try {
				anyTrue = getter.call(value) === typedArray;
			} catch (e) { /**/ }
		}
	});
	return anyTrue;
};

module.exports = function isTypedArray(value) {
	if (!value || typeof value !== 'object') { return false; }
	if (!hasToStringTag || !(Symbol.toStringTag in value)) {
		var tag = $slice($toString(value), 8, -1);
		return $indexOf(typedArrays, tag) > -1;
	}
	if (!gOPD) { return false; }
	return tryTypedArrays(value);
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"available-typed-arrays":2,"call-bind/callBound":7,"for-each":10,"gopd":14,"has-tostringtag/shams":17}],26:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

exports.homedir = function () {
	return '/'
};

},{}],27:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))
},{"_process":28}],28:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],29:[function(require,module,exports){
(function (global){(function (){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],30:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],31:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],32:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":30,"./encode":31}],33:[function(require,module,exports){
/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":5}],34:[function(require,module,exports){
(function (global){(function (){
var ClientRequest = require('./lib/request')
var response = require('./lib/response')
var extend = require('xtend')
var statusCodes = require('builtin-status-codes')
var url = require('url')

var http = exports

http.request = function (opts, cb) {
	if (typeof opts === 'string')
		opts = url.parse(opts)
	else
		opts = extend(opts)

	// Normally, the page is loaded from http or https, so not specifying a protocol
	// will result in a (valid) protocol-relative url. However, this won't work if
	// the protocol is something else, like 'file:'
	var defaultProtocol = global.location.protocol.search(/^https?:$/) === -1 ? 'http:' : ''

	var protocol = opts.protocol || defaultProtocol
	var host = opts.hostname || opts.host
	var port = opts.port
	var path = opts.path || '/'

	// Necessary for IPv6 addresses
	if (host && host.indexOf(':') !== -1)
		host = '[' + host + ']'

	// This may be a relative url. The browser should always be able to interpret it correctly.
	opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path
	opts.method = (opts.method || 'GET').toUpperCase()
	opts.headers = opts.headers || {}

	// Also valid opts.auth, opts.mode

	var req = new ClientRequest(opts)
	if (cb)
		req.on('response', cb)
	return req
}

http.get = function get (opts, cb) {
	var req = http.request(opts, cb)
	req.end()
	return req
}

http.ClientRequest = ClientRequest
http.IncomingMessage = response.IncomingMessage

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.globalAgent = new http.Agent()

http.STATUS_CODES = statusCodes

http.METHODS = [
	'CHECKOUT',
	'CONNECT',
	'COPY',
	'DELETE',
	'GET',
	'HEAD',
	'LOCK',
	'M-SEARCH',
	'MERGE',
	'MKACTIVITY',
	'MKCOL',
	'MOVE',
	'NOTIFY',
	'OPTIONS',
	'PATCH',
	'POST',
	'PROPFIND',
	'PROPPATCH',
	'PURGE',
	'PUT',
	'REPORT',
	'SEARCH',
	'SUBSCRIBE',
	'TRACE',
	'UNLOCK',
	'UNSUBSCRIBE'
]
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/request":36,"./lib/response":37,"builtin-status-codes":6,"url":55,"xtend":62}],35:[function(require,module,exports){
(function (global){(function (){
exports.fetch = isFunction(global.fetch) && isFunction(global.ReadableStream)

exports.writableStream = isFunction(global.WritableStream)

exports.abortController = isFunction(global.AbortController)

// The xhr request to example.com may violate some restrictive CSP configurations,
// so if we're running in a browser that supports `fetch`, avoid calling getXHR()
// and assume support for certain features below.
var xhr
function getXHR () {
	// Cache the xhr value
	if (xhr !== undefined) return xhr

	if (global.XMLHttpRequest) {
		xhr = new global.XMLHttpRequest()
		// If XDomainRequest is available (ie only, where xhr might not work
		// cross domain), use the page location. Otherwise use example.com
		// Note: this doesn't actually make an http request.
		try {
			xhr.open('GET', global.XDomainRequest ? '/' : 'https://example.com')
		} catch(e) {
			xhr = null
		}
	} else {
		// Service workers don't have XHR
		xhr = null
	}
	return xhr
}

function checkTypeSupport (type) {
	var xhr = getXHR()
	if (!xhr) return false
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

// If fetch is supported, then arraybuffer will be supported too. Skip calling
// checkTypeSupport(), since that calls getXHR().
exports.arraybuffer = exports.fetch || checkTypeSupport('arraybuffer')

// These next two tests unavoidably show warnings in Chrome. Since fetch will always
// be used if it's available, just return false for these to avoid the warnings.
exports.msstream = !exports.fetch && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = !exports.fetch && checkTypeSupport('moz-chunked-arraybuffer')

// If fetch is supported, then overrideMimeType will be supported too. Skip calling
// getXHR().
exports.overrideMimeType = exports.fetch || (getXHR() ? isFunction(getXHR().overrideMimeType) : false)

function isFunction (value) {
	return typeof value === 'function'
}

xhr = null // Help gc

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],36:[function(require,module,exports){
(function (process,global,Buffer){(function (){
var capability = require('./capability')
var inherits = require('inherits')
var response = require('./response')
var stream = require('readable-stream')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary, useFetch) {
	if (capability.fetch && useFetch) {
		return 'fetch'
	} else if (capability.mozchunkedarraybuffer) {
		return 'moz-chunked-arraybuffer'
	} else if (capability.msstream) {
		return 'ms-stream'
	} else if (capability.arraybuffer && preferBinary) {
		return 'arraybuffer'
	} else {
		return 'text'
	}
}

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._body = []
	self._headers = {}
	if (opts.auth)
		self.setHeader('Authorization', 'Basic ' + Buffer.from(opts.auth).toString('base64'))
	Object.keys(opts.headers).forEach(function (name) {
		self.setHeader(name, opts.headers[name])
	})

	var preferBinary
	var useFetch = true
	if (opts.mode === 'disable-fetch' || ('requestTimeout' in opts && !capability.abortController)) {
		// If the use of XHR should be preferred. Not typically needed.
		useFetch = false
		preferBinary = true
	} else if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility and
		// the accuracy of the 'content-type' header aren't
		preferBinary = false
	} else if (opts.mode === 'allow-wrong-content-type') {
		// If streaming is more important than preserving the 'content-type' header
		preferBinary = !capability.overrideMimeType
	} else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
		// Use binary if text streaming may corrupt data or the content-type header, or for speed
		preferBinary = true
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	self._mode = decideMode(preferBinary, useFetch)
	self._fetchTimer = null
	self._socketTimeout = null
	self._socketTimer = null

	self.on('finish', function () {
		self._onFinish()
	})
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var self = this
	var lowerName = name.toLowerCase()
	// This check is not necessary, but it prevents warnings from browsers about setting unsafe
	// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
	// http-browserify did it, so I will too.
	if (unsafeHeaders.indexOf(lowerName) !== -1)
		return

	self._headers[lowerName] = {
		name: name,
		value: value
	}
}

ClientRequest.prototype.getHeader = function (name) {
	var header = this._headers[name.toLowerCase()]
	if (header)
		return header.value
	return null
}

ClientRequest.prototype.removeHeader = function (name) {
	var self = this
	delete self._headers[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
	var self = this

	if (self._destroyed)
		return
	var opts = self._opts

	if ('timeout' in opts && opts.timeout !== 0) {
		self.setTimeout(opts.timeout)
	}

	var headersObj = self._headers
	var body = null
	if (opts.method !== 'GET' && opts.method !== 'HEAD') {
        body = new Blob(self._body, {
            type: (headersObj['content-type'] || {}).value || ''
        });
    }

	// create flattened list of headers
	var headersList = []
	Object.keys(headersObj).forEach(function (keyName) {
		var name = headersObj[keyName].name
		var value = headersObj[keyName].value
		if (Array.isArray(value)) {
			value.forEach(function (v) {
				headersList.push([name, v])
			})
		} else {
			headersList.push([name, value])
		}
	})

	if (self._mode === 'fetch') {
		var signal = null
		if (capability.abortController) {
			var controller = new AbortController()
			signal = controller.signal
			self._fetchAbortController = controller

			if ('requestTimeout' in opts && opts.requestTimeout !== 0) {
				self._fetchTimer = global.setTimeout(function () {
					self.emit('requestTimeout')
					if (self._fetchAbortController)
						self._fetchAbortController.abort()
				}, opts.requestTimeout)
			}
		}

		global.fetch(self._opts.url, {
			method: self._opts.method,
			headers: headersList,
			body: body || undefined,
			mode: 'cors',
			credentials: opts.withCredentials ? 'include' : 'same-origin',
			signal: signal
		}).then(function (response) {
			self._fetchResponse = response
			self._resetTimers(false)
			self._connect()
		}, function (reason) {
			self._resetTimers(true)
			if (!self._destroyed)
				self.emit('error', reason)
		})
	} else {
		var xhr = self._xhr = new global.XMLHttpRequest()
		try {
			xhr.open(self._opts.method, self._opts.url, true)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = self._mode

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.withCredentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		if ('requestTimeout' in opts) {
			xhr.timeout = opts.requestTimeout
			xhr.ontimeout = function () {
				self.emit('requestTimeout')
			}
		}

		headersList.forEach(function (header) {
			xhr.setRequestHeader(header[0], header[1])
		})

		self._response = null
		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
				case rStates.DONE:
					self._onXHRProgress()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (self._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = function () {
				self._onXHRProgress()
			}
		}

		xhr.onerror = function () {
			if (self._destroyed)
				return
			self._resetTimers(true)
			self.emit('error', new Error('XHR error'))
		}

		try {
			xhr.send(body)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}
	}
}

/**
 * Checks if xhr.status is readable and non-zero, indicating no error.
 * Even though the spec says it should be available in readyState 3,
 * accessing it throws an exception in IE8
 */
function statusValid (xhr) {
	try {
		var status = xhr.status
		return (status !== null && status !== 0)
	} catch (e) {
		return false
	}
}

ClientRequest.prototype._onXHRProgress = function () {
	var self = this

	self._resetTimers(false)

	if (!statusValid(self._xhr) || self._destroyed)
		return

	if (!self._response)
		self._connect()

	self._response._onXHRProgress(self._resetTimers.bind(self))
}

ClientRequest.prototype._connect = function () {
	var self = this

	if (self._destroyed)
		return

	self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode, self._resetTimers.bind(self))
	self._response.on('error', function(err) {
		self.emit('error', err)
	})

	self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	var self = this

	self._body.push(chunk)
	cb()
}

ClientRequest.prototype._resetTimers = function (done) {
	var self = this

	global.clearTimeout(self._socketTimer)
	self._socketTimer = null

	if (done) {
		global.clearTimeout(self._fetchTimer)
		self._fetchTimer = null
	} else if (self._socketTimeout) {
		self._socketTimer = global.setTimeout(function () {
			self.emit('timeout')
		}, self._socketTimeout)
	}
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function (err) {
	var self = this
	self._destroyed = true
	self._resetTimers(true)
	if (self._response)
		self._response._destroyed = true
	if (self._xhr)
		self._xhr.abort()
	else if (self._fetchAbortController)
		self._fetchAbortController.abort()

	if (err)
		self.emit('error', err)
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	var self = this
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	stream.Writable.prototype.end.call(self, data, encoding, cb)
}

ClientRequest.prototype.setTimeout = function (timeout, cb) {
	var self = this

	if (cb)
		self.once('timeout', cb)

	self._socketTimeout = timeout
	self._resetTimers(false)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'via'
]

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":35,"./response":37,"_process":28,"buffer":5,"inherits":21,"readable-stream":52}],37:[function(require,module,exports){
(function (process,global,Buffer){(function (){
var capability = require('./capability')
var inherits = require('inherits')
var stream = require('readable-stream')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode, resetTimers) {
	var self = this
	stream.Readable.call(self)

	self._mode = mode
	self.headers = {}
	self.rawHeaders = []
	self.trailers = {}
	self.rawTrailers = []

	// Fake the 'close' event, but only once 'end' fires
	self.on('end', function () {
		// The nextTick is necessary to prevent the 'request' module from causing an infinite loop
		process.nextTick(function () {
			self.emit('close')
		})
	})

	if (mode === 'fetch') {
		self._fetchResponse = response

		self.url = response.url
		self.statusCode = response.status
		self.statusMessage = response.statusText
		
		response.headers.forEach(function (header, key){
			self.headers[key.toLowerCase()] = header
			self.rawHeaders.push(key, header)
		})

		if (capability.writableStream) {
			var writable = new WritableStream({
				write: function (chunk) {
					resetTimers(false)
					return new Promise(function (resolve, reject) {
						if (self._destroyed) {
							reject()
						} else if(self.push(Buffer.from(chunk))) {
							resolve()
						} else {
							self._resumeFetch = resolve
						}
					})
				},
				close: function () {
					resetTimers(true)
					if (!self._destroyed)
						self.push(null)
				},
				abort: function (err) {
					resetTimers(true)
					if (!self._destroyed)
						self.emit('error', err)
				}
			})

			try {
				response.body.pipeTo(writable).catch(function (err) {
					resetTimers(true)
					if (!self._destroyed)
						self.emit('error', err)
				})
				return
			} catch (e) {} // pipeTo method isn't defined. Can't find a better way to feature test this
		}
		// fallback for when writableStream or pipeTo aren't available
		var reader = response.body.getReader()
		function read () {
			reader.read().then(function (result) {
				if (self._destroyed)
					return
				resetTimers(result.done)
				if (result.done) {
					self.push(null)
					return
				}
				self.push(Buffer.from(result.value))
				read()
			}).catch(function (err) {
				resetTimers(true)
				if (!self._destroyed)
					self.emit('error', err)
			})
		}
		read()
	} else {
		self._xhr = xhr
		self._pos = 0

		self.url = xhr.responseURL
		self.statusCode = xhr.status
		self.statusMessage = xhr.statusText
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		headers.forEach(function (header) {
			var matches = header.match(/^([^:]+):\s*(.*)/)
			if (matches) {
				var key = matches[1].toLowerCase()
				if (key === 'set-cookie') {
					if (self.headers[key] === undefined) {
						self.headers[key] = []
					}
					self.headers[key].push(matches[2])
				} else if (self.headers[key] !== undefined) {
					self.headers[key] += ', ' + matches[2]
				} else {
					self.headers[key] = matches[2]
				}
				self.rawHeaders.push(matches[1], matches[2])
			}
		})

		self._charset = 'x-user-defined'
		if (!capability.overrideMimeType) {
			var mimeType = self.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					self._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!self._charset)
				self._charset = 'utf-8' // best guess
		}
	}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {
	var self = this

	var resolve = self._resumeFetch
	if (resolve) {
		self._resumeFetch = null
		resolve()
	}
}

IncomingMessage.prototype._onXHRProgress = function (resetTimers) {
	var self = this

	var xhr = self._xhr

	var response = null
	switch (self._mode) {
		case 'text':
			response = xhr.responseText
			if (response.length > self._pos) {
				var newData = response.substr(self._pos)
				if (self._charset === 'x-user-defined') {
					var buffer = Buffer.alloc(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i) & 0xff

					self.push(buffer)
				} else {
					self.push(newData, self._charset)
				}
				self._pos = response.length
			}
			break
		case 'arraybuffer':
			if (xhr.readyState !== rStates.DONE || !xhr.response)
				break
			response = xhr.response
			self.push(Buffer.from(new Uint8Array(response)))
			break
		case 'moz-chunked-arraybuffer': // take whole
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING || !response)
				break
			self.push(Buffer.from(new Uint8Array(response)))
			break
		case 'ms-stream':
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new global.MSStreamReader()
			reader.onprogress = function () {
				if (reader.result.byteLength > self._pos) {
					self.push(Buffer.from(new Uint8Array(reader.result.slice(self._pos))))
					self._pos = reader.result.byteLength
				}
			}
			reader.onload = function () {
				resetTimers(true)
				self.push(null)
			}
			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
		resetTimers(true)
		self.push(null)
	}
}

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":35,"_process":28,"buffer":5,"inherits":21,"readable-stream":52}],38:[function(require,module,exports){
'use strict';

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var codes = {};

function createErrorType(code, message, Base) {
  if (!Base) {
    Base = Error;
  }

  function getMessage(arg1, arg2, arg3) {
    if (typeof message === 'string') {
      return message;
    } else {
      return message(arg1, arg2, arg3);
    }
  }

  var NodeError =
  /*#__PURE__*/
  function (_Base) {
    _inheritsLoose(NodeError, _Base);

    function NodeError(arg1, arg2, arg3) {
      return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
    }

    return NodeError;
  }(Base);

  NodeError.prototype.name = Base.name;
  NodeError.prototype.code = code;
  codes[code] = NodeError;
} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


function oneOf(expected, thing) {
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map(function (i) {
      return String(i);
    });

    if (len > 2) {
      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
    } else if (len === 2) {
      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
    } else {
      return "of ".concat(thing, " ").concat(expected[0]);
    }
  } else {
    return "of ".concat(thing, " ").concat(String(expected));
  }
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


function startsWith(str, search, pos) {
  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


function endsWith(str, search, this_len) {
  if (this_len === undefined || this_len > str.length) {
    this_len = str.length;
  }

  return str.substring(this_len - search.length, this_len) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


function includes(str, search, start) {
  if (typeof start !== 'number') {
    start = 0;
  }

  if (start + search.length > str.length) {
    return false;
  } else {
    return str.indexOf(search, start) !== -1;
  }
}

createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
  return 'The value "' + value + '" is invalid for option "' + name + '"';
}, TypeError);
createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
  // determiner: 'must be' or 'must not be'
  var determiner;

  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
    determiner = 'must not be';
    expected = expected.replace(/^not /, '');
  } else {
    determiner = 'must be';
  }

  var msg;

  if (endsWith(name, ' argument')) {
    // For cases like 'first argument'
    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  } else {
    var type = includes(name, '.') ? 'property' : 'argument';
    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  }

  msg += ". Received type ".concat(typeof actual);
  return msg;
}, TypeError);
createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
  return 'The ' + name + ' method is not implemented';
});
createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
createErrorType('ERR_STREAM_DESTROYED', function (name) {
  return 'Cannot call ' + name + ' after a stream was destroyed';
});
createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
  return 'Unknown encoding: ' + arg;
}, TypeError);
createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');
module.exports.codes = codes;

},{}],39:[function(require,module,exports){
(function (process){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
};
/*</replacement>*/

module.exports = Duplex;
var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');
require('inherits')(Duplex, Readable);
{
  // Allow the keys array to be GC'ed.
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}
function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);
  Readable.call(this, options);
  Writable.call(this, options);
  this.allowHalfOpen = true;
  if (options) {
    if (options.readable === false) this.readable = false;
    if (options.writable === false) this.writable = false;
    if (options.allowHalfOpen === false) {
      this.allowHalfOpen = false;
      this.once('end', onend);
    }
  }
}
Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});
Object.defineProperty(Duplex.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
Object.defineProperty(Duplex.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});

// the no-half-open enforcer
function onend() {
  // If the writable side ended, then we're ok.
  if (this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(onEndNT, this);
}
function onEndNT(self) {
  self.end();
}
Object.defineProperty(Duplex.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});
}).call(this)}).call(this,require('_process'))
},{"./_stream_readable":41,"./_stream_writable":43,"_process":28,"inherits":21}],40:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;
var Transform = require('./_stream_transform');
require('inherits')(PassThrough, Transform);
function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);
  Transform.call(this, options);
}
PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":42,"inherits":21}],41:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

module.exports = Readable;

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;
var EElistenerCount = function EElistenerCount(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

var Buffer = require('buffer').Buffer;
var OurUint8Array = (typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*<replacement>*/
var debugUtil = require('util');
var debug;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function debug() {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/buffer_list');
var destroyImpl = require('./internal/streams/destroy');
var _require = require('./internal/streams/state'),
  getHighWaterMark = _require.getHighWaterMark;
var _require$codes = require('../errors').codes,
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;

// Lazy loaded to improve the startup performance.
var StringDecoder;
var createReadableStreamAsyncIterator;
var from;
require('inherits')(Readable, Stream);
var errorOrDestroy = destroyImpl.errorOrDestroy;
var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];
function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}
function ReadableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;
  this.paused = true;

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = options.emitClose !== false;

  // Should .destroy() be called after 'end' (and potentially 'finish')
  this.autoDestroy = !!options.autoDestroy;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;
  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}
function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');
  if (!(this instanceof Readable)) return new Readable(options);

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the ReadableState constructor, at least with V8 6.5
  var isDuplex = this instanceof Duplex;
  this._readableState = new ReadableState(options, this, isDuplex);

  // legacy
  this.readable = true;
  if (options) {
    if (typeof options.read === 'function') this._read = options.read;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }
  Stream.call(this);
}
Object.defineProperty(Readable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});
Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;
  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }
  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};
function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  debug('readableAddChunk', chunk);
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      errorOrDestroy(stream, er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }
      if (addToFront) {
        if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      } else if (state.destroyed) {
        return false;
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
      maybeReadMore(stream, state);
    }
  }

  // We can push more data if we are below the highWaterMark.
  // Also, if we have no data yet, we can stand some more bytes.
  // This is to work around cases where hwm=0, such as the repl.
  return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}
function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    state.awaitDrain = 0;
    stream.emit('data', chunk);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}
function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
  }
  return er;
}
Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  var decoder = new StringDecoder(enc);
  this._readableState.decoder = decoder;
  // If setEncoding(null), decoder.encoding equals utf8
  this._readableState.encoding = this._readableState.decoder.encoding;

  // Iterate over current buffer to convert already stored Buffers:
  var p = this._readableState.buffer.head;
  var content = '';
  while (p !== null) {
    content += decoder.write(p.data);
    p = p.next;
  }
  this._readableState.buffer.clear();
  if (content !== '') this._readableState.buffer.push(content);
  this._readableState.length = content.length;
  return this;
};

// Don't raise the hwm > 1GB
var MAX_HWM = 0x40000000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;
  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }
  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }
  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;
  if (ret === null) {
    state.needReadable = state.length <= state.highWaterMark;
    n = 0;
  } else {
    state.length -= n;
    state.awaitDrain = 0;
  }
  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }
  if (ret !== null) this.emit('data', ret);
  return ret;
};
function onEofChunk(stream, state) {
  debug('onEofChunk');
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;
  if (state.sync) {
    // if we are sync, wait until next tick to emit the data.
    // Otherwise we risk emitting data in the flow()
    // the readable code triggers during a read() call
    emitReadable(stream);
  } else {
    // emit 'readable' now to make sure it gets picked up.
    state.needReadable = false;
    if (!state.emittedReadable) {
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  debug('emitReadable', state.needReadable, state.emittedReadable);
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    process.nextTick(emitReadable_, stream);
  }
}
function emitReadable_(stream) {
  var state = stream._readableState;
  debug('emitReadable_', state.destroyed, state.length, state.ended);
  if (!state.destroyed && (state.length || state.ended)) {
    stream.emit('readable');
    state.emittedReadable = false;
  }

  // The stream needs another readable event if
  // 1. It is not flowing, as the flow mechanism will take
  //    care of it.
  // 2. It is not ended.
  // 3. It is below the highWaterMark, so we can schedule
  //    another readable later.
  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(maybeReadMore_, stream, state);
  }
}
function maybeReadMore_(stream, state) {
  // Attempt to read more data if we should.
  //
  // The conditions for reading more data are (one of):
  // - Not enough data buffered (state.length < state.highWaterMark). The loop
  //   is responsible for filling the buffer with enough data if such data
  //   is available. If highWaterMark is 0 and we are not in the flowing mode
  //   we should _not_ attempt to buffer any extra data. We'll get more data
  //   when the stream consumer calls read() instead.
  // - No data in the buffer, and the stream is in flowing mode. In this mode
  //   the loop below is responsible for ensuring read() is called. Failing to
  //   call read here would abort the flow and there's no other mechanism for
  //   continuing the flow if the stream consumer has just subscribed to the
  //   'data' event.
  //
  // In addition to the above conditions to keep reading data, the following
  // conditions prevent the data from being read:
  // - The stream has ended (state.ended).
  // - There is already a pending 'read' operation (state.reading). This is a
  //   case where the the stream has called the implementation defined _read()
  //   method, but they are processing the call asynchronously and have _not_
  //   called push() with new data. In this case we skip performing more
  //   read()s. The execution ends in this method again after the _read() ends
  //   up calling push() with more data.
  while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
    var len = state.length;
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED('_read()'));
};
Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;
  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) process.nextTick(endFn);else src.once('end', endFn);
  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }
  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);
  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);
    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    debug('dest.write', ret);
    if (ret === false) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', state.awaitDrain);
        state.awaitDrain++;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);
  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }
  return dest;
};
function pipeOnDrain(src) {
  return function pipeOnDrainFunctionResult() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}
Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = {
    hasUnpiped: false
  };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;
    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    for (var i = 0; i < len; i++) dests[i].emit('unpipe', this, {
      hasUnpiped: false
    });
    return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;
  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];
  dest.emit('unpipe', this, unpipeInfo);
  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);
  var state = this._readableState;
  if (ev === 'data') {
    // update readableListening so that resume() may be a no-op
    // a few lines down. This is needed to support once('readable').
    state.readableListening = this.listenerCount('readable') > 0;

    // Try start flowing on next tick if stream isn't explicitly paused
    if (state.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.flowing = false;
      state.emittedReadable = false;
      debug('on readable', state.length, state.reading);
      if (state.length) {
        emitReadable(this);
      } else if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      }
    }
  }
  return res;
};
Readable.prototype.addListener = Readable.prototype.on;
Readable.prototype.removeListener = function (ev, fn) {
  var res = Stream.prototype.removeListener.call(this, ev, fn);
  if (ev === 'readable') {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }
  return res;
};
Readable.prototype.removeAllListeners = function (ev) {
  var res = Stream.prototype.removeAllListeners.apply(this, arguments);
  if (ev === 'readable' || ev === undefined) {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }
  return res;
};
function updateReadableListening(self) {
  var state = self._readableState;
  state.readableListening = self.listenerCount('readable') > 0;
  if (state.resumeScheduled && !state.paused) {
    // flowing needs to be set to true now, otherwise
    // the upcoming resume will not flow.
    state.flowing = true;

    // crude way to check if we should resume
  } else if (self.listenerCount('data') > 0) {
    self.resume();
  }
}
function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    // we flow only if there is no one listening
    // for readable, but we still have to call
    // resume()
    state.flowing = !state.readableListening;
    resume(this, state);
  }
  state.paused = false;
  return this;
};
function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(resume_, stream, state);
  }
}
function resume_(stream, state) {
  debug('resume', state.reading);
  if (!state.reading) {
    stream.read(0);
  }
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}
Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (this._readableState.flowing !== false) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  this._readableState.paused = true;
  return this;
};
function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null);
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;
  var state = this._readableState;
  var paused = false;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }
    _this.push(null);
  });
  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;
    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function methodWrap(method) {
        return function methodWrapReturnFunction() {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };
  return this;
};
if (typeof Symbol === 'function') {
  Readable.prototype[Symbol.asyncIterator] = function () {
    if (createReadableStreamAsyncIterator === undefined) {
      createReadableStreamAsyncIterator = require('./internal/streams/async_iterator');
    }
    return createReadableStreamAsyncIterator(this);
  };
}
Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.highWaterMark;
  }
});
Object.defineProperty(Readable.prototype, 'readableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState && this._readableState.buffer;
  }
});
Object.defineProperty(Readable.prototype, 'readableFlowing', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.flowing;
  },
  set: function set(state) {
    if (this._readableState) {
      this._readableState.flowing = state;
    }
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;
Object.defineProperty(Readable.prototype, 'readableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.length;
  }
});

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;
  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.first();else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = state.buffer.consume(n, state.decoder);
  }
  return ret;
}
function endReadable(stream) {
  var state = stream._readableState;
  debug('endReadable', state.endEmitted);
  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(endReadableNT, state, stream);
  }
}
function endReadableNT(state, stream) {
  debug('endReadableNT', state.endEmitted, state.length);

  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
    if (state.autoDestroy) {
      // In case of duplex streams we need a way to detect
      // if the writable side is ready for autoDestroy as well
      var wState = stream._writableState;
      if (!wState || wState.autoDestroy && wState.finished) {
        stream.destroy();
      }
    }
  }
}
if (typeof Symbol === 'function') {
  Readable.from = function (iterable, opts) {
    if (from === undefined) {
      from = require('./internal/streams/from');
    }
    return from(Readable, iterable, opts);
  };
}
function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":38,"./_stream_duplex":39,"./internal/streams/async_iterator":44,"./internal/streams/buffer_list":45,"./internal/streams/destroy":46,"./internal/streams/from":48,"./internal/streams/state":50,"./internal/streams/stream":51,"_process":28,"buffer":5,"events":9,"inherits":21,"string_decoder/":53,"util":4}],42:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;
var _require$codes = require('../errors').codes,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
  ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
  ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;
var Duplex = require('./_stream_duplex');
require('inherits')(Transform, Duplex);
function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;
  var cb = ts.writecb;
  if (cb === null) {
    return this.emit('error', new ERR_MULTIPLE_CALLBACK());
  }
  ts.writechunk = null;
  ts.writecb = null;
  if (data != null)
    // single equals check for both `null` and `undefined`
    this.push(data);
  cb(er);
  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}
function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);
  Duplex.call(this, options);
  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;
  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;
    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}
function prefinish() {
  var _this = this;
  if (typeof this._flush === 'function' && !this._readableState.destroyed) {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}
Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
};
Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;
  if (ts.writechunk !== null && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};
Transform.prototype._destroy = function (err, cb) {
  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
  });
};
function done(stream, er, data) {
  if (er) return stream.emit('error', er);
  if (data != null)
    // single equals check for both `null` and `undefined`
    stream.push(data);

  // TODO(BridgeAR): Write a test for these two error cases
  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
  if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
  return stream.push(null);
}
},{"../errors":38,"./_stream_duplex":39,"inherits":21}],43:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;
  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

var Buffer = require('buffer').Buffer;
var OurUint8Array = (typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
var destroyImpl = require('./internal/streams/destroy');
var _require = require('./internal/streams/state'),
  getHighWaterMark = _require.getHighWaterMark;
var _require$codes = require('../errors').codes,
  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
  ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
  ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
  ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END,
  ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;
var errorOrDestroy = destroyImpl.errorOrDestroy;
require('inherits')(Writable, Stream);
function nop() {}
function WritableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream,
  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.
  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  this.highWaterMark = getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;
  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // Should close be emitted on destroy. Defaults to true.
  this.emitClose = options.emitClose !== false;

  // Should .destroy() be called after 'finish' (and potentially 'end')
  this.autoDestroy = !!options.autoDestroy;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}
WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};
(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function writableStateBufferGetter() {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function value(object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;
      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function realHasInstance(object) {
    return object instanceof this;
  };
}
function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.

  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the WritableState constructor, at least with V8 6.5
  var isDuplex = this instanceof Duplex;
  if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
  this._writableState = new WritableState(options, this, isDuplex);

  // legacy.
  this.writable = true;
  if (options) {
    if (typeof options.write === 'function') this._write = options.write;
    if (typeof options.writev === 'function') this._writev = options.writev;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
    if (typeof options.final === 'function') this._final = options.final;
  }
  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
};
function writeAfterEnd(stream, cb) {
  var er = new ERR_STREAM_WRITE_AFTER_END();
  // TODO: defer error events consistently everywhere, not just the cb
  errorOrDestroy(stream, er);
  process.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var er;
  if (chunk === null) {
    er = new ERR_STREAM_NULL_VALUES();
  } else if (typeof chunk !== 'string' && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer'], chunk);
  }
  if (er) {
    errorOrDestroy(stream, er);
    process.nextTick(cb, er);
    return false;
  }
  return true;
}
Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);
  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }
  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }
  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
  if (typeof cb !== 'function') cb = nop;
  if (state.ending) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }
  return ret;
};
Writable.prototype.cork = function () {
  this._writableState.corked++;
};
Writable.prototype.uncork = function () {
  var state = this._writableState;
  if (state.corked) {
    state.corked--;
    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};
Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};
Object.defineProperty(Writable.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}
Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;
  state.length += len;
  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;
  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }
  return ret;
}
function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write'));else if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}
function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    process.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    process.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}
function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}
function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;
  if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK();
  onwriteStateUpdate(state);
  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state) || stream.destroyed;
    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }
    if (sync) {
      process.nextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}
function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;
  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;
    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;
    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;
      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }
    if (entry === null) state.lastBufferedRequest = null;
  }
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}
Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_write()'));
};
Writable.prototype._writev = null;
Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;
  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }
  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending) endWritable(this, state, cb);
  return this;
};
Object.defineProperty(Writable.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});
function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      errorOrDestroy(stream, err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function' && !state.destroyed) {
      state.pendingcb++;
      state.finalCalled = true;
      process.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}
function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
      if (state.autoDestroy) {
        // In case of duplex streams we need a way to detect
        // if the readable side is ready for autoDestroy as well
        var rState = stream._readableState;
        if (!rState || rState.autoDestroy && rState.endEmitted) {
          stream.destroy();
        }
      }
    }
  }
  return need;
}
function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) process.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}
function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }

  // reuse the free corkReq.
  state.corkedRequestsFree.next = corkReq;
}
Object.defineProperty(Writable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});
Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  cb(err);
};
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":38,"./_stream_duplex":39,"./internal/streams/destroy":46,"./internal/streams/state":50,"./internal/streams/stream":51,"_process":28,"buffer":5,"inherits":21,"util-deprecate":57}],44:[function(require,module,exports){
(function (process){(function (){
'use strict';

var _Object$setPrototypeO;
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var finished = require('./end-of-stream');
var kLastResolve = Symbol('lastResolve');
var kLastReject = Symbol('lastReject');
var kError = Symbol('error');
var kEnded = Symbol('ended');
var kLastPromise = Symbol('lastPromise');
var kHandlePromise = Symbol('handlePromise');
var kStream = Symbol('stream');
function createIterResult(value, done) {
  return {
    value: value,
    done: done
  };
}
function readAndResolve(iter) {
  var resolve = iter[kLastResolve];
  if (resolve !== null) {
    var data = iter[kStream].read();
    // we defer if data is null
    // we can be expecting either 'end' or
    // 'error'
    if (data !== null) {
      iter[kLastPromise] = null;
      iter[kLastResolve] = null;
      iter[kLastReject] = null;
      resolve(createIterResult(data, false));
    }
  }
}
function onReadable(iter) {
  // we wait for the next tick, because it might
  // emit an error with process.nextTick
  process.nextTick(readAndResolve, iter);
}
function wrapForNext(lastPromise, iter) {
  return function (resolve, reject) {
    lastPromise.then(function () {
      if (iter[kEnded]) {
        resolve(createIterResult(undefined, true));
        return;
      }
      iter[kHandlePromise](resolve, reject);
    }, reject);
  };
}
var AsyncIteratorPrototype = Object.getPrototypeOf(function () {});
var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
  get stream() {
    return this[kStream];
  },
  next: function next() {
    var _this = this;
    // if we have detected an error in the meanwhile
    // reject straight away
    var error = this[kError];
    if (error !== null) {
      return Promise.reject(error);
    }
    if (this[kEnded]) {
      return Promise.resolve(createIterResult(undefined, true));
    }
    if (this[kStream].destroyed) {
      // We need to defer via nextTick because if .destroy(err) is
      // called, the error will be emitted via nextTick, and
      // we cannot guarantee that there is no error lingering around
      // waiting to be emitted.
      return new Promise(function (resolve, reject) {
        process.nextTick(function () {
          if (_this[kError]) {
            reject(_this[kError]);
          } else {
            resolve(createIterResult(undefined, true));
          }
        });
      });
    }

    // if we have multiple next() calls
    // we will wait for the previous Promise to finish
    // this logic is optimized to support for await loops,
    // where next() is only called once at a time
    var lastPromise = this[kLastPromise];
    var promise;
    if (lastPromise) {
      promise = new Promise(wrapForNext(lastPromise, this));
    } else {
      // fast path needed to support multiple this.push()
      // without triggering the next() queue
      var data = this[kStream].read();
      if (data !== null) {
        return Promise.resolve(createIterResult(data, false));
      }
      promise = new Promise(this[kHandlePromise]);
    }
    this[kLastPromise] = promise;
    return promise;
  }
}, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
  return this;
}), _defineProperty(_Object$setPrototypeO, "return", function _return() {
  var _this2 = this;
  // destroy(err, cb) is a private API
  // we can guarantee we have that here, because we control the
  // Readable class this is attached to
  return new Promise(function (resolve, reject) {
    _this2[kStream].destroy(null, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(createIterResult(undefined, true));
    });
  });
}), _Object$setPrototypeO), AsyncIteratorPrototype);
var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator(stream) {
  var _Object$create;
  var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
    value: stream,
    writable: true
  }), _defineProperty(_Object$create, kLastResolve, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kLastReject, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kError, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kEnded, {
    value: stream._readableState.endEmitted,
    writable: true
  }), _defineProperty(_Object$create, kHandlePromise, {
    value: function value(resolve, reject) {
      var data = iterator[kStream].read();
      if (data) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        resolve(createIterResult(data, false));
      } else {
        iterator[kLastResolve] = resolve;
        iterator[kLastReject] = reject;
      }
    },
    writable: true
  }), _Object$create));
  iterator[kLastPromise] = null;
  finished(stream, function (err) {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      var reject = iterator[kLastReject];
      // reject if we are waiting for data in the Promise
      // returned by next() and store the error
      if (reject !== null) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        reject(err);
      }
      iterator[kError] = err;
      return;
    }
    var resolve = iterator[kLastResolve];
    if (resolve !== null) {
      iterator[kLastPromise] = null;
      iterator[kLastResolve] = null;
      iterator[kLastReject] = null;
      resolve(createIterResult(undefined, true));
    }
    iterator[kEnded] = true;
  });
  stream.on('readable', onReadable.bind(null, iterator));
  return iterator;
};
module.exports = createReadableStreamAsyncIterator;
}).call(this)}).call(this,require('_process'))
},{"./end-of-stream":47,"_process":28}],45:[function(require,module,exports){
'use strict';

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
var _require = require('buffer'),
  Buffer = _require.Buffer;
var _require2 = require('util'),
  inspect = _require2.inspect;
var custom = inspect && inspect.custom || 'inspect';
function copyBuffer(src, target, offset) {
  Buffer.prototype.copy.call(src, target, offset);
}
module.exports = /*#__PURE__*/function () {
  function BufferList() {
    _classCallCheck(this, BufferList);
    this.head = null;
    this.tail = null;
    this.length = 0;
  }
  _createClass(BufferList, [{
    key: "push",
    value: function push(v) {
      var entry = {
        data: v,
        next: null
      };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    }
  }, {
    key: "unshift",
    value: function unshift(v) {
      var entry = {
        data: v,
        next: this.head
      };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    }
  }, {
    key: "shift",
    value: function shift() {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.head = this.tail = null;
      this.length = 0;
    }
  }, {
    key: "join",
    value: function join(s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;
      while (p = p.next) ret += s + p.data;
      return ret;
    }
  }, {
    key: "concat",
    value: function concat(n) {
      if (this.length === 0) return Buffer.alloc(0);
      var ret = Buffer.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;
      while (p) {
        copyBuffer(p.data, ret, i);
        i += p.data.length;
        p = p.next;
      }
      return ret;
    }

    // Consumes a specified amount of bytes or characters from the buffered data.
  }, {
    key: "consume",
    value: function consume(n, hasStrings) {
      var ret;
      if (n < this.head.data.length) {
        // `slice` is the same for buffers and strings.
        ret = this.head.data.slice(0, n);
        this.head.data = this.head.data.slice(n);
      } else if (n === this.head.data.length) {
        // First chunk is a perfect match.
        ret = this.shift();
      } else {
        // Result spans more than one buffer.
        ret = hasStrings ? this._getString(n) : this._getBuffer(n);
      }
      return ret;
    }
  }, {
    key: "first",
    value: function first() {
      return this.head.data;
    }

    // Consumes a specified amount of characters from the buffered data.
  }, {
    key: "_getString",
    value: function _getString(n) {
      var p = this.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;
      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;
        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = str.slice(nb);
          }
          break;
        }
        ++c;
      }
      this.length -= c;
      return ret;
    }

    // Consumes a specified amount of bytes from the buffered data.
  }, {
    key: "_getBuffer",
    value: function _getBuffer(n) {
      var ret = Buffer.allocUnsafe(n);
      var p = this.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;
      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;
        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = buf.slice(nb);
          }
          break;
        }
        ++c;
      }
      this.length -= c;
      return ret;
    }

    // Make sure the linked list only shows the minimal necessary information.
  }, {
    key: custom,
    value: function value(_, options) {
      return inspect(this, _objectSpread(_objectSpread({}, options), {}, {
        // Only inspect one level.
        depth: 0,
        // It should not recurse.
        customInspect: false
      }));
    }
  }]);
  return BufferList;
}();
},{"buffer":5,"util":4}],46:[function(require,module,exports){
(function (process){(function (){
'use strict';

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;
  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;
  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err) {
      if (!this._writableState) {
        process.nextTick(emitErrorNT, this, err);
      } else if (!this._writableState.errorEmitted) {
        this._writableState.errorEmitted = true;
        process.nextTick(emitErrorNT, this, err);
      }
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }
  this._destroy(err || null, function (err) {
    if (!cb && err) {
      if (!_this._writableState) {
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else if (!_this._writableState.errorEmitted) {
        _this._writableState.errorEmitted = true;
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else {
        process.nextTick(emitCloseNT, _this);
      }
    } else if (cb) {
      process.nextTick(emitCloseNT, _this);
      cb(err);
    } else {
      process.nextTick(emitCloseNT, _this);
    }
  });
  return this;
}
function emitErrorAndCloseNT(self, err) {
  emitErrorNT(self, err);
  emitCloseNT(self);
}
function emitCloseNT(self) {
  if (self._writableState && !self._writableState.emitClose) return;
  if (self._readableState && !self._readableState.emitClose) return;
  self.emit('close');
}
function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }
  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finalCalled = false;
    this._writableState.prefinished = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}
function emitErrorNT(self, err) {
  self.emit('error', err);
}
function errorOrDestroy(stream, err) {
  // We have tests that rely on errors being emitted
  // in the same tick, so changing this is semver major.
  // For now when you opt-in to autoDestroy we allow
  // the error to be emitted nextTick. In a future
  // semver major update we should change the default to this.

  var rState = stream._readableState;
  var wState = stream._writableState;
  if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err);else stream.emit('error', err);
}
module.exports = {
  destroy: destroy,
  undestroy: undestroy,
  errorOrDestroy: errorOrDestroy
};
}).call(this)}).call(this,require('_process'))
},{"_process":28}],47:[function(require,module,exports){
// Ported from https://github.com/mafintosh/end-of-stream with
// permission from the author, Mathias Buus (@mafintosh).

'use strict';

var ERR_STREAM_PREMATURE_CLOSE = require('../../../errors').codes.ERR_STREAM_PREMATURE_CLOSE;
function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    callback.apply(this, args);
  };
}
function noop() {}
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}
function eos(stream, opts, callback) {
  if (typeof opts === 'function') return eos(stream, null, opts);
  if (!opts) opts = {};
  callback = once(callback || noop);
  var readable = opts.readable || opts.readable !== false && stream.readable;
  var writable = opts.writable || opts.writable !== false && stream.writable;
  var onlegacyfinish = function onlegacyfinish() {
    if (!stream.writable) onfinish();
  };
  var writableEnded = stream._writableState && stream._writableState.finished;
  var onfinish = function onfinish() {
    writable = false;
    writableEnded = true;
    if (!readable) callback.call(stream);
  };
  var readableEnded = stream._readableState && stream._readableState.endEmitted;
  var onend = function onend() {
    readable = false;
    readableEnded = true;
    if (!writable) callback.call(stream);
  };
  var onerror = function onerror(err) {
    callback.call(stream, err);
  };
  var onclose = function onclose() {
    var err;
    if (readable && !readableEnded) {
      if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
    if (writable && !writableEnded) {
      if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
  };
  var onrequest = function onrequest() {
    stream.req.on('finish', onfinish);
  };
  if (isRequest(stream)) {
    stream.on('complete', onfinish);
    stream.on('abort', onclose);
    if (stream.req) onrequest();else stream.on('request', onrequest);
  } else if (writable && !stream._writableState) {
    // legacy streams
    stream.on('end', onlegacyfinish);
    stream.on('close', onlegacyfinish);
  }
  stream.on('end', onend);
  stream.on('finish', onfinish);
  if (opts.error !== false) stream.on('error', onerror);
  stream.on('close', onclose);
  return function () {
    stream.removeListener('complete', onfinish);
    stream.removeListener('abort', onclose);
    stream.removeListener('request', onrequest);
    if (stream.req) stream.req.removeListener('finish', onfinish);
    stream.removeListener('end', onlegacyfinish);
    stream.removeListener('close', onlegacyfinish);
    stream.removeListener('finish', onfinish);
    stream.removeListener('end', onend);
    stream.removeListener('error', onerror);
    stream.removeListener('close', onclose);
  };
}
module.exports = eos;
},{"../../../errors":38}],48:[function(require,module,exports){
module.exports = function () {
  throw new Error('Readable.from is not available in the browser')
};

},{}],49:[function(require,module,exports){
// Ported from https://github.com/mafintosh/pump with
// permission from the author, Mathias Buus (@mafintosh).

'use strict';

var eos;
function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    callback.apply(void 0, arguments);
  };
}
var _require$codes = require('../../../errors').codes,
  ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;
function noop(err) {
  // Rethrow the error if it exists to avoid swallowing it
  if (err) throw err;
}
function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}
function destroyer(stream, reading, writing, callback) {
  callback = once(callback);
  var closed = false;
  stream.on('close', function () {
    closed = true;
  });
  if (eos === undefined) eos = require('./end-of-stream');
  eos(stream, {
    readable: reading,
    writable: writing
  }, function (err) {
    if (err) return callback(err);
    closed = true;
    callback();
  });
  var destroyed = false;
  return function (err) {
    if (closed) return;
    if (destroyed) return;
    destroyed = true;

    // request.destroy just do .end - .abort is what we want
    if (isRequest(stream)) return stream.abort();
    if (typeof stream.destroy === 'function') return stream.destroy();
    callback(err || new ERR_STREAM_DESTROYED('pipe'));
  };
}
function call(fn) {
  fn();
}
function pipe(from, to) {
  return from.pipe(to);
}
function popCallback(streams) {
  if (!streams.length) return noop;
  if (typeof streams[streams.length - 1] !== 'function') return noop;
  return streams.pop();
}
function pipeline() {
  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
    streams[_key] = arguments[_key];
  }
  var callback = popCallback(streams);
  if (Array.isArray(streams[0])) streams = streams[0];
  if (streams.length < 2) {
    throw new ERR_MISSING_ARGS('streams');
  }
  var error;
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1;
    var writing = i > 0;
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err;
      if (err) destroys.forEach(call);
      if (reading) return;
      destroys.forEach(call);
      callback(error);
    });
  });
  return streams.reduce(pipe);
}
module.exports = pipeline;
},{"../../../errors":38,"./end-of-stream":47}],50:[function(require,module,exports){
'use strict';

var ERR_INVALID_OPT_VALUE = require('../../../errors').codes.ERR_INVALID_OPT_VALUE;
function highWaterMarkFrom(options, isDuplex, duplexKey) {
  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
}
function getHighWaterMark(state, options, duplexKey, isDuplex) {
  var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
  if (hwm != null) {
    if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
      var name = isDuplex ? duplexKey : 'highWaterMark';
      throw new ERR_INVALID_OPT_VALUE(name, hwm);
    }
    return Math.floor(hwm);
  }

  // Default value
  return state.objectMode ? 16 : 16 * 1024;
}
module.exports = {
  getHighWaterMark: getHighWaterMark
};
},{"../../../errors":38}],51:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":9}],52:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');
exports.finished = require('./lib/internal/streams/end-of-stream.js');
exports.pipeline = require('./lib/internal/streams/pipeline.js');

},{"./lib/_stream_duplex.js":39,"./lib/_stream_passthrough.js":40,"./lib/_stream_readable.js":41,"./lib/_stream_transform.js":42,"./lib/_stream_writable.js":43,"./lib/internal/streams/end-of-stream.js":47,"./lib/internal/streams/pipeline.js":49}],53:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":33}],54:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":28,"timers":54}],55:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":56,"punycode":29,"querystring":32}],56:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],57:[function(require,module,exports){
(function (global){(function (){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],58:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],59:[function(require,module,exports){
// Currently in sync with Node.js lib/internal/util/types.js
// https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9

'use strict';

var isArgumentsObject = require('is-arguments');
var isGeneratorFunction = require('is-generator-function');
var whichTypedArray = require('which-typed-array');
var isTypedArray = require('is-typed-array');

function uncurryThis(f) {
  return f.call.bind(f);
}

var BigIntSupported = typeof BigInt !== 'undefined';
var SymbolSupported = typeof Symbol !== 'undefined';

var ObjectToString = uncurryThis(Object.prototype.toString);

var numberValue = uncurryThis(Number.prototype.valueOf);
var stringValue = uncurryThis(String.prototype.valueOf);
var booleanValue = uncurryThis(Boolean.prototype.valueOf);

if (BigIntSupported) {
  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
}

if (SymbolSupported) {
  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
}

function checkBoxedPrimitive(value, prototypeValueOf) {
  if (typeof value !== 'object') {
    return false;
  }
  try {
    prototypeValueOf(value);
    return true;
  } catch(e) {
    return false;
  }
}

exports.isArgumentsObject = isArgumentsObject;
exports.isGeneratorFunction = isGeneratorFunction;
exports.isTypedArray = isTypedArray;

// Taken from here and modified for better browser support
// https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
function isPromise(input) {
	return (
		(
			typeof Promise !== 'undefined' &&
			input instanceof Promise
		) ||
		(
			input !== null &&
			typeof input === 'object' &&
			typeof input.then === 'function' &&
			typeof input.catch === 'function'
		)
	);
}
exports.isPromise = isPromise;

function isArrayBufferView(value) {
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    return ArrayBuffer.isView(value);
  }

  return (
    isTypedArray(value) ||
    isDataView(value)
  );
}
exports.isArrayBufferView = isArrayBufferView;


function isUint8Array(value) {
  return whichTypedArray(value) === 'Uint8Array';
}
exports.isUint8Array = isUint8Array;

function isUint8ClampedArray(value) {
  return whichTypedArray(value) === 'Uint8ClampedArray';
}
exports.isUint8ClampedArray = isUint8ClampedArray;

function isUint16Array(value) {
  return whichTypedArray(value) === 'Uint16Array';
}
exports.isUint16Array = isUint16Array;

function isUint32Array(value) {
  return whichTypedArray(value) === 'Uint32Array';
}
exports.isUint32Array = isUint32Array;

function isInt8Array(value) {
  return whichTypedArray(value) === 'Int8Array';
}
exports.isInt8Array = isInt8Array;

function isInt16Array(value) {
  return whichTypedArray(value) === 'Int16Array';
}
exports.isInt16Array = isInt16Array;

function isInt32Array(value) {
  return whichTypedArray(value) === 'Int32Array';
}
exports.isInt32Array = isInt32Array;

function isFloat32Array(value) {
  return whichTypedArray(value) === 'Float32Array';
}
exports.isFloat32Array = isFloat32Array;

function isFloat64Array(value) {
  return whichTypedArray(value) === 'Float64Array';
}
exports.isFloat64Array = isFloat64Array;

function isBigInt64Array(value) {
  return whichTypedArray(value) === 'BigInt64Array';
}
exports.isBigInt64Array = isBigInt64Array;

function isBigUint64Array(value) {
  return whichTypedArray(value) === 'BigUint64Array';
}
exports.isBigUint64Array = isBigUint64Array;

function isMapToString(value) {
  return ObjectToString(value) === '[object Map]';
}
isMapToString.working = (
  typeof Map !== 'undefined' &&
  isMapToString(new Map())
);

function isMap(value) {
  if (typeof Map === 'undefined') {
    return false;
  }

  return isMapToString.working
    ? isMapToString(value)
    : value instanceof Map;
}
exports.isMap = isMap;

function isSetToString(value) {
  return ObjectToString(value) === '[object Set]';
}
isSetToString.working = (
  typeof Set !== 'undefined' &&
  isSetToString(new Set())
);
function isSet(value) {
  if (typeof Set === 'undefined') {
    return false;
  }

  return isSetToString.working
    ? isSetToString(value)
    : value instanceof Set;
}
exports.isSet = isSet;

function isWeakMapToString(value) {
  return ObjectToString(value) === '[object WeakMap]';
}
isWeakMapToString.working = (
  typeof WeakMap !== 'undefined' &&
  isWeakMapToString(new WeakMap())
);
function isWeakMap(value) {
  if (typeof WeakMap === 'undefined') {
    return false;
  }

  return isWeakMapToString.working
    ? isWeakMapToString(value)
    : value instanceof WeakMap;
}
exports.isWeakMap = isWeakMap;

function isWeakSetToString(value) {
  return ObjectToString(value) === '[object WeakSet]';
}
isWeakSetToString.working = (
  typeof WeakSet !== 'undefined' &&
  isWeakSetToString(new WeakSet())
);
function isWeakSet(value) {
  return isWeakSetToString(value);
}
exports.isWeakSet = isWeakSet;

function isArrayBufferToString(value) {
  return ObjectToString(value) === '[object ArrayBuffer]';
}
isArrayBufferToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  isArrayBufferToString(new ArrayBuffer())
);
function isArrayBuffer(value) {
  if (typeof ArrayBuffer === 'undefined') {
    return false;
  }

  return isArrayBufferToString.working
    ? isArrayBufferToString(value)
    : value instanceof ArrayBuffer;
}
exports.isArrayBuffer = isArrayBuffer;

function isDataViewToString(value) {
  return ObjectToString(value) === '[object DataView]';
}
isDataViewToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  typeof DataView !== 'undefined' &&
  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
);
function isDataView(value) {
  if (typeof DataView === 'undefined') {
    return false;
  }

  return isDataViewToString.working
    ? isDataViewToString(value)
    : value instanceof DataView;
}
exports.isDataView = isDataView;

// Store a copy of SharedArrayBuffer in case it's deleted elsewhere
var SharedArrayBufferCopy = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
function isSharedArrayBufferToString(value) {
  return ObjectToString(value) === '[object SharedArrayBuffer]';
}
function isSharedArrayBuffer(value) {
  if (typeof SharedArrayBufferCopy === 'undefined') {
    return false;
  }

  if (typeof isSharedArrayBufferToString.working === 'undefined') {
    isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
  }

  return isSharedArrayBufferToString.working
    ? isSharedArrayBufferToString(value)
    : value instanceof SharedArrayBufferCopy;
}
exports.isSharedArrayBuffer = isSharedArrayBuffer;

function isAsyncFunction(value) {
  return ObjectToString(value) === '[object AsyncFunction]';
}
exports.isAsyncFunction = isAsyncFunction;

function isMapIterator(value) {
  return ObjectToString(value) === '[object Map Iterator]';
}
exports.isMapIterator = isMapIterator;

function isSetIterator(value) {
  return ObjectToString(value) === '[object Set Iterator]';
}
exports.isSetIterator = isSetIterator;

function isGeneratorObject(value) {
  return ObjectToString(value) === '[object Generator]';
}
exports.isGeneratorObject = isGeneratorObject;

function isWebAssemblyCompiledModule(value) {
  return ObjectToString(value) === '[object WebAssembly.Module]';
}
exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

function isNumberObject(value) {
  return checkBoxedPrimitive(value, numberValue);
}
exports.isNumberObject = isNumberObject;

function isStringObject(value) {
  return checkBoxedPrimitive(value, stringValue);
}
exports.isStringObject = isStringObject;

function isBooleanObject(value) {
  return checkBoxedPrimitive(value, booleanValue);
}
exports.isBooleanObject = isBooleanObject;

function isBigIntObject(value) {
  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
}
exports.isBigIntObject = isBigIntObject;

function isSymbolObject(value) {
  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
}
exports.isSymbolObject = isSymbolObject;

function isBoxedPrimitive(value) {
  return (
    isNumberObject(value) ||
    isStringObject(value) ||
    isBooleanObject(value) ||
    isBigIntObject(value) ||
    isSymbolObject(value)
  );
}
exports.isBoxedPrimitive = isBoxedPrimitive;

function isAnyArrayBuffer(value) {
  return typeof Uint8Array !== 'undefined' && (
    isArrayBuffer(value) ||
    isSharedArrayBuffer(value)
  );
}
exports.isAnyArrayBuffer = isAnyArrayBuffer;

['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
  Object.defineProperty(exports, method, {
    enumerable: false,
    value: function() {
      throw new Error(method + ' is not supported in userland');
    }
  });
});

},{"is-arguments":22,"is-generator-function":24,"is-typed-array":25,"which-typed-array":61}],60:[function(require,module,exports){
(function (process){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
  function getOwnPropertyDescriptors(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};
    for (var i = 0; i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }
    return descriptors;
  };

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  if (typeof process !== 'undefined' && process.noDeprecation === true) {
    return fn;
  }

  // Allow for deprecating things in the process of starting up.
  if (typeof process === 'undefined') {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnvRegex = /^$/;

if (process.env.NODE_DEBUG) {
  var debugEnv = process.env.NODE_DEBUG;
  debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/,/g, '$|^')
    .toUpperCase();
  debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
}
exports.debuglog = function(set) {
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (debugEnvRegex.test(set)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').slice(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.slice(1, -1);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
exports.types = require('./support/types');

function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;
exports.types.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;
exports.types.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;
exports.types.isNativeError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

exports.promisify = function promisify(original) {
  if (typeof original !== 'function')
    throw new TypeError('The "original" argument must be of type Function');

  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
    var fn = original[kCustomPromisifiedSymbol];
    if (typeof fn !== 'function') {
      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
    }
    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    });
    return fn;
  }

  function fn() {
    var promiseResolve, promiseReject;
    var promise = new Promise(function (resolve, reject) {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    args.push(function (err, value) {
      if (err) {
        promiseReject(err);
      } else {
        promiseResolve(value);
      }
    });

    try {
      original.apply(this, args);
    } catch (err) {
      promiseReject(err);
    }

    return promise;
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn, enumerable: false, writable: false, configurable: true
  });
  return Object.defineProperties(
    fn,
    getOwnPropertyDescriptors(original)
  );
}

exports.promisify.custom = kCustomPromisifiedSymbol

function callbackifyOnRejected(reason, cb) {
  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
  // Because `null` is a special error value in callbacks which means "no error
  // occurred", we error-wrap so the callback consumer can distinguish between
  // "the promise rejected with null" or "the promise fulfilled with undefined".
  if (!reason) {
    var newReason = new Error('Promise was rejected with a falsy value');
    newReason.reason = reason;
    reason = newReason;
  }
  return cb(reason);
}

function callbackify(original) {
  if (typeof original !== 'function') {
    throw new TypeError('The "original" argument must be of type Function');
  }

  // We DO NOT return the promise as it gives the user a false sense that
  // the promise is actually somehow related to the callback's execution
  // and that the callback throwing will reject the promise.
  function callbackified() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    var maybeCb = args.pop();
    if (typeof maybeCb !== 'function') {
      throw new TypeError('The last argument must be of type Function');
    }
    var self = this;
    var cb = function() {
      return maybeCb.apply(self, arguments);
    };
    // In true node style we process the callback on `nextTick` with all the
    // implications (stack, `uncaughtException`, `async_hooks`)
    original.apply(this, args)
      .then(function(ret) { process.nextTick(cb.bind(null, null, ret)) },
            function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)) });
  }

  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
  Object.defineProperties(callbackified,
                          getOwnPropertyDescriptors(original));
  return callbackified;
}
exports.callbackify = callbackify;

}).call(this)}).call(this,require('_process'))
},{"./support/isBuffer":58,"./support/types":59,"_process":28,"inherits":21}],61:[function(require,module,exports){
(function (global){(function (){
'use strict';

var forEach = require('for-each');
var availableTypedArrays = require('available-typed-arrays');
var callBound = require('call-bind/callBound');
var gOPD = require('gopd');

var $toString = callBound('Object.prototype.toString');
var hasToStringTag = require('has-tostringtag/shams')();

var g = typeof globalThis === 'undefined' ? global : globalThis;
var typedArrays = availableTypedArrays();

var $slice = callBound('String.prototype.slice');
var toStrTags = {};
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		if (typeof g[typedArray] === 'function') {
			var arr = new g[typedArray]();
			if (Symbol.toStringTag in arr) {
				var proto = getPrototypeOf(arr);
				var descriptor = gOPD(proto, Symbol.toStringTag);
				if (!descriptor) {
					var superProto = getPrototypeOf(proto);
					descriptor = gOPD(superProto, Symbol.toStringTag);
				}
				toStrTags[typedArray] = descriptor.get;
			}
		}
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var foundName = false;
	forEach(toStrTags, function (getter, typedArray) {
		if (!foundName) {
			try {
				var name = getter.call(value);
				if (name === typedArray) {
					foundName = name;
				}
			} catch (e) {}
		}
	});
	return foundName;
};

var isTypedArray = require('is-typed-array');

module.exports = function whichTypedArray(value) {
	if (!isTypedArray(value)) { return false; }
	if (!hasToStringTag || !(Symbol.toStringTag in value)) { return $slice($toString(value), 8, -1); }
	return tryTypedArrays(value);
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"available-typed-arrays":2,"call-bind/callBound":7,"for-each":10,"gopd":14,"has-tostringtag/shams":17,"is-typed-array":25}],62:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],63:[function(require,module,exports){

const fs = require('fs');
const ipp = require('ipp');
const dnssd = require('dnssd'); 

function printJob() {
// need these from HotelUser Table
let pdf = '';
let domain = '';
let username = '';
let jobname = '';

fs.readFile(pdf, function(err, data) { 
if (err)
    throw err;

let printer = ipp.Printer(domain);
let msg = {
    "operation-attributes-tag": {
    "requesting-user-name": username,
    "job-name": jobname,
    "document-format": "application/pdf"
    },
    data: data
};
printer.execute("Print-Job", msg, function(err, res){
    console.log(res);
});
});
}

function findPrinters(){

const browser = dnssd.Browser(dnssd.tcp('printer'))
  .on('serviceUp', service => {
      con.connect(function(err) {
          if (err) throw err;
          let sql = `INSERT INTO dbmaster.Printer (PrinterID, AdminID, PrinterName, ErrorID, JobID, SerialKey, IPAddress, IPVersion, Interface, Port, Make, Model, Domain) VALUES (null, 1, ${service.name}, 1, 1, ${service.txt.UUID}, ${service.addresses[0]}, 'IPv4', 'IPP', ${service.port}, ${service.usb_MFG}, ${service.usb_MDL}, ${service.domain})`;
          con.query(sql, function (err, result) {
              if (err) throw err;
          });
      });
  })
.start();
} 
},{"dnssd":64,"fs":1,"ipp":94}],64:[function(require,module,exports){
var Advertisement    = require('./lib/Advertisement');
var Browser          = require('./lib/Browser');
var ServiceType      = require('./lib/ServiceType');
var validate         = require('./lib/validate');
var resolve          = require('./lib/resolve');
var NetworkInterface = require('./lib/NetworkInterface');


module.exports = {
  Advertisement:  Advertisement,
  Browser:        Browser,
  ServiceType:    ServiceType,
  tcp:            ServiceType.tcp,
  udp:            ServiceType.udp,
  all:            ServiceType.all,
  validate:       validate,
  resolve:        resolve.resolve,
  resolveA:       resolve.resolveA,
  resolveAAAA:    resolve.resolveAAAA,
  resolveSRV:     resolve.resolveSRV,
  resolveTXT:     resolve.resolveTXT,
  resolveService: resolve.resolveService,
};

},{"./lib/Advertisement":65,"./lib/Browser":66,"./lib/NetworkInterface":72,"./lib/ServiceType":82,"./lib/resolve":91,"./lib/validate":93}],65:[function(require,module,exports){
(function (setImmediate,__filename){(function (){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var os = require('os');

var misc = require('./misc');
var validate = require('./validate');
var ServiceType = require('./ServiceType');
var EventEmitter = require('./EventEmitter');
var ResourceRecord = require('./ResourceRecord');
var QueryRecord = require('./QueryRecord');
var Packet = require('./Packet');
var sleep = require('./sleep');

var Responder = require('./Responder');
var NetworkInterface = require('./NetworkInterface');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var RType = require('./constants').RType;
var STATE = { STOPPED: 'stopped', STARTED: 'started' };

/**
 * Creates a new Advertisement
 *
 * @emits 'error'
 * @emits 'stopped' when the advertisement is stopped
 * @emits 'instanceRenamed' when the service instance is renamed
 * @emits 'hostRenamed' when the hostname has to be renamed
 *
 * @param {ServiceType|Object|String|Array} type - type of service to advertise
 * @param {Number}                          port - port to advertise
 *
 * @param {Object}   [options]
 * @param {Object}   options.name       - instance name
 * @param {Object}   options.host       - hostname to use
 * @param {Object}   options.txt        - TXT record
 * @param {Object}   options.subtypes   - subtypes to register
 * @param {Object}   options.interface  - interface name or address to use
 */
function Advertisement(type, port) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  if (!(this instanceof Advertisement)) {
    return new Advertisement(type, port, options);
  }

  EventEmitter.call(this);

  // convert argument ServiceType to validate it (might throw)
  var serviceType = !(type instanceof ServiceType) ? new ServiceType(type) : type;

  // validate other inputs (throws on invalid)
  validate.port(port);

  if (options.txt) validate.txt(options.txt);
  if (options.name) validate.label(options.name, 'Instance');
  if (options.host) validate.label(options.host, 'Hostname');

  this.serviceName = serviceType.name;
  this.protocol = serviceType.protocol;
  this.subtypes = options.subtypes ? options.subtypes : serviceType.subtypes;
  this.port = port;
  this.instanceName = options.name || misc.hostname();
  this.hostname = options.host || misc.hostname();
  this.txt = options.txt || {};

  // Domain notes:
  // 1- link-local only, so this is the only possible value
  // 2- "_domain" used instead of "domain" because "domain" is an instance var
  //    in older versions of EventEmitter. Using "domain" messes up `this.emit()`
  this._domain = 'local';

  this._id = misc.fqdn(this.instanceName, this.serviceName, this.protocol, 'local');
  debug('Creating new advertisement for "' + this._id + '" on ' + port);

  this.state = STATE.STOPPED;
  this._interface = NetworkInterface.get(options.interface);
  this._defaultAddresses = null;
  this._hostnameResponder = null;
  this._serviceResponder = null;
}

Advertisement.prototype = Object.create(EventEmitter.prototype);
Advertisement.prototype.constructor = Advertisement;

/**
 * Starts advertisement
 *
 * In order:
 *   - bind interface to multicast port
 *   - make records and advertise this.hostname
 *   - make records and advertise service
 *
 * If the given hostname is already taken by someone else (not including
 * bonjour/avahi on the same machine), the hostname is automatically renamed
 * following the pattern:
 * Name -> Name (2)
 *
 * Services aren't advertised until the hostname has been properly advertised
 * because a service needs a host. Service instance names (this.instanceName)
 * have to be unique and get renamed automatically the same way.
 *
 * @return {this}
 */
Advertisement.prototype.start = function () {
  var _this = this;

  if (this.state === STATE.STARTED) {
    debug('Advertisement already started!');
    return this;
  }

  debug('Starting advertisement "' + this._id + '"');
  this.state = STATE.STARTED;

  // restart probing process when waking from sleep
  sleep.using(this).on('wake', this._restart);

  // treat interface errors as fatal
  this._interface.using(this).once('error', this._onError);

  this._interface.bind().then(function () {
    return _this._getDefaultID();
  }).then(function () {
    return _this._advertiseHostname();
  }).then(function () {
    return _this._advertiseService();
  }).catch(function (err) {
    return _this._onError(err);
  });

  return this;
};

/**
 * Stops advertisement
 *
 * Advertisement can do either a clean stop or a forced stop. A clean stop will
 * send goodbye records out so others will know the service is going down. This
 * takes ~1s. Forced goodbyes shut everything down immediately w/o goodbyes.
 *
 * `this._shutdown()` will deregister the advertisement. If the advertisement was
 * the only thing using the interface it will shut down too.
 *
 * @emits 'stopped'
 *
 * @param {Boolean} [forceImmediate]
 */
Advertisement.prototype.stop = function (forceImmediate, callback) {
  var _this2 = this;

  debug('Stopping advertisement "' + this._id + '"...');
  this.state = STATE.STOPPED;

  var shutdown = function shutdown() {
    _this2._hostnameResponder = null;
    _this2._serviceResponder = null;

    _this2._interface.removeListenersCreatedBy(_this2);
    _this2._interface.stopUsing();
    sleep.removeListenersCreatedBy(_this2);

    debug('Stopped.');

    callback && callback();
    _this2.emit('stopped');
  };

  // If doing a clean stop, responders need to send goodbyes before turning off
  // the interface. Depending on when the advertisment was stopped, it could
  // have one, two, or no active responders that need to send goodbyes
  var numResponders = 0;
  if (this._serviceResponder) numResponders++;
  if (this._hostnameResponder) numResponders++;

  var done = misc.after_n(shutdown, numResponders);

  // immediate shutdown (forced or if there aren't any active responders)
  // or wait for goodbyes on a clean shutdown
  if (forceImmediate || !numResponders) {
    this._serviceResponder && this._serviceResponder.stop();
    this._hostnameResponder && this._hostnameResponder.stop();
    shutdown();
  } else {
    this._serviceResponder && this._serviceResponder.goodbye(done);
    this._hostnameResponder && this._hostnameResponder.goodbye(done);
  }
};

/**
 * Updates the adverts TXT record
 * @param {object} txtObj
 */
Advertisement.prototype.updateTXT = function (txtObj) {
  var _this3 = this;

  // validates txt first, will throw validation errors on bad input
  validate.txt(txtObj);

  // make sure responder handles network requests in event loop before updating
  // (otherwise could have unintended record conflicts)
  setImmediate(function () {
    _this3._serviceResponder.updateEach(RType.TXT, function (record) {
      record.txtRaw = misc.makeRawTXT(txtObj);
      record.txt = misc.makeReadableTXT(txtObj);
    });
  });
};

/**
 * Error handler. Does immediate shutdown
 * @emits 'error'
 */
Advertisement.prototype._onError = function (err) {
  debug('Error on "' + this._id + '", shutting down. Got: \n' + err);

  this.stop(true); // stop immediately
  this.emit('error', err);
};

Advertisement.prototype._restart = function () {
  var _this4 = this;

  if (this.state !== STATE.STARTED) return debug('Not yet started, skipping');
  debug('Waking from sleep, restarting "' + this._id + '"');

  // stop responders if they exist
  this._serviceResponder && this._serviceResponder.stop();
  this._hostnameResponder && this._hostnameResponder.stop();

  this._hostnameResponder = null;
  this._serviceResponder = null;

  // need to check if active interface has changed
  this._getDefaultID().then(function () {
    return _this4._advertiseHostname();
  }).then(function () {
    return _this4._advertiseService();
  }).catch(function (err) {
    return _this4._onError(err);
  });
};

Advertisement.prototype._getDefaultID = function () {
  var _this5 = this;

  debug('Trying to find the default route (' + this._id + ')');

  return new Promise(function (resolve, reject) {
    var self = _this5;

    var question = new QueryRecord({ name: misc.fqdn(_this5.hostname, _this5._domain) });
    var queryPacket = new Packet();
    queryPacket.setQuestions([question]);

    // try to listen for our own query
    _this5._interface.on('query', function handler(packet) {
      if (packet.isLocal() && packet.equals(queryPacket)) {
        self._defaultAddresses = Object.values(os.networkInterfaces()).find(function (intf) {
          return intf.some(function (_ref) {
            var address = _ref.address;
            return address === packet.origin.address;
          });
        });

        if (self._defaultAddresses) {
          self._interface.off('query', handler);
          resolve();
        }
      }
    });

    _this5._interface.send(queryPacket);
    setTimeout(function () {
      return reject(new Error('Timed out getting default route'));
    }, 500);
  });
};

/**
 * Advertise the same hostname
 *
 * A new responder is created for this task. A responder is a state machine
 * that will talk to the network to do advertising. Its responsible for a
 * single record set from `_makeAddressRecords` and automatically renames
 * them if conflicts are found.
 *
 * Returns a promise that resolves when a hostname has been authoritatively
 * advertised. Rejects on fatal errors only.
 *
 * @return {Promise}
 */
Advertisement.prototype._advertiseHostname = function () {
  var _ref2,
      _this6 = this;

  var interfaces = Object.values(os.networkInterfaces());

  var records = this._makeAddressRecords(this._defaultAddresses);
  var bridgeable = (_ref2 = []).concat.apply(_ref2, _toConsumableArray(interfaces.map(function (i) {
    return _this6._makeAddressRecords(i);
  })));

  return new Promise(function (resolve, reject) {
    var responder = new Responder(_this6._interface, records, bridgeable);
    _this6._hostnameResponder = responder;

    responder.on('rename', _this6._onHostRename.bind(_this6));
    responder.once('probingComplete', resolve);
    responder.once('error', reject);

    responder.start();
  });
};

/**
 * Handles rename events from the interface hostname responder.
 *
 * If a conflict was been found with a proposed hostname, the responder will
 * rename and probe again. This event fires *after* the rename but *before*
 * probing, so the name here isn't guaranteed yet.
 *
 * The hostname responder will update its A/AAAA record set with the new name
 * when it does the renaming. The service responder will need to update the
 * hostname in its SRV record.
 *
 * @emits 'hostRenamed'
 *
 * @param {String} hostname - the new current hostname
 */
Advertisement.prototype._onHostRename = function (hostname) {
  debug('Hostname renamed to "' + hostname + '" on interface records');

  var target = misc.fqdn(hostname, this._domain);
  this.hostname = hostname;

  if (this._serviceResponder) {
    this._serviceResponder.updateEach(RType.SRV, function (record) {
      record.target = target;
    });
  }

  this.emit('hostRenamed', target);
};

/**
 * Advertises the service
 *
 * A new responder is created for this task also. The responder will manage
 * the record set from `_makeServiceRecords` and automatically rename them
 * if conflicts are found.
 *
 * The responder will keeps advertising/responding until `advertisement.stop()`
 * tells it to stop.
 *
 * @emits 'instanceRenamed' when the service instance is renamed
 */
Advertisement.prototype._advertiseService = function () {
  var _this7 = this;

  var records = this._makeServiceRecords();

  var responder = new Responder(this._interface, records);
  this._serviceResponder = responder;

  responder.on('rename', function (instance) {
    debug('Service instance had to be renamed to "' + instance + '"');
    _this7._id = misc.fqdn(instance, _this7.serviceName, _this7.protocol, 'local');
    _this7.instanceName = instance;
    _this7.emit('instanceRenamed', instance);
  });

  responder.once('probingComplete', function () {
    debug('Probed successfully, "' + _this7._id + '" now active');
    _this7.emit('active');
  });

  responder.once('error', this._onError.bind(this));
  responder.start();
};

/**
 * Make the A/AAAA records that will be used on an interface.
 *
 * Each interface will have its own A/AAAA records generated because the
 * IPv4/IPv6 addresses will be different on each interface.
 *
 * NSEC records are created to show which records are available with this name.
 * This lets others know if an AAAA doesn't exist, for example.
 * (See 8.2.4 Negative Responses or whatever)
 *
 * @param  {NetworkInterface} intf
 * @return {ResourceRecords[]}
 */
Advertisement.prototype._makeAddressRecords = function (addresses) {
  var name = misc.fqdn(this.hostname, this._domain);

  var As = addresses.filter(function (_ref3) {
    var family = _ref3.family;
    return family === 'IPv4';
  }).map(function (_ref4) {
    var address = _ref4.address;
    return new ResourceRecord.A({ name: name, address: address });
  });

  var AAAAs = addresses.filter(function (_ref5) {
    var family = _ref5.family;
    return family === 'IPv6';
  }).filter(function (_ref6) {
    var address = _ref6.address;
    return address.substr(0, 6).toLowerCase() === 'fe80::';
  }).map(function (_ref7) {
    var address = _ref7.address;
    return new ResourceRecord.AAAA({ name: name, address: address });
  });

  var types = [];
  if (As.length) types.push(RType.A);
  if (AAAAs.length) types.push(RType.AAAA);

  var NSEC = new ResourceRecord.NSEC({
    name: name,
    ttl: 120,
    existing: types
  });

  As.forEach(function (A) {
    A.additionals = AAAAs.length ? [].concat(_toConsumableArray(AAAAs), [NSEC]) : [NSEC];
  });

  AAAAs.forEach(function (AAAA) {
    AAAA.additionals = As.length ? [].concat(_toConsumableArray(As), [NSEC]) : [NSEC];
  });

  return [].concat(_toConsumableArray(As), _toConsumableArray(AAAAs), [NSEC]);
};

/**
 * Make the SRV/TXT/PTR records that will be used on an interface.
 *
 * Each interface will have its own SRV/TXT/PTR records generated because
 * these records are dependent on the A/AAAA hostname records, which are
 * different for each hostname.
 *
 * NSEC records are created to show which records are available with this name.
 *
 * @return {ResourceRecords[]}
 */
Advertisement.prototype._makeServiceRecords = function () {
  var records = [];
  var interfaceRecords = this._hostnameResponder.getRecords();

  // enumerator  : "_services._dns-sd._udp.local."
  // registration: "_http._tcp.local."
  // serviceName : "A web page._http._tcp.local."
  var enumerator = misc.fqdn('_services._dns-sd._udp', this._domain);
  var registration = misc.fqdn(this.serviceName, this.protocol, this._domain);
  var serviceName = misc.fqdn(this.instanceName, registration);

  var NSEC = new ResourceRecord.NSEC({
    name: serviceName,
    existing: [RType.SRV, RType.TXT]
  });

  var SRV = new ResourceRecord.SRV({
    name: serviceName,
    target: misc.fqdn(this.hostname, this._domain),
    port: this.port,
    additionals: [NSEC].concat(_toConsumableArray(interfaceRecords))
  });

  var TXT = new ResourceRecord.TXT({
    name: serviceName,
    additionals: [NSEC],
    txt: this.txt
  });

  records.push(SRV);
  records.push(TXT);
  records.push(NSEC);

  records.push(new ResourceRecord.PTR({
    name: registration,
    PTRDName: serviceName,
    additionals: [SRV, TXT, NSEC].concat(_toConsumableArray(interfaceRecords))
  }));

  records.push(new ResourceRecord.PTR({
    name: enumerator,
    PTRDName: registration
  }));

  // ex: "_printer.sub._http._tcp.local."
  this.subtypes.forEach(function (subType) {
    records.push(new ResourceRecord.PTR({
      name: misc.fqdn(subType, '_sub', registration),
      PTRDName: serviceName,
      additionals: [SRV, TXT, NSEC].concat(_toConsumableArray(interfaceRecords))
    }));
  });

  return records;
};

module.exports = Advertisement;
}).call(this)}).call(this,require("timers").setImmediate,"/node_modules/dnssd/lib/Advertisement.js")
},{"./EventEmitter":69,"./NetworkInterface":72,"./Packet":73,"./QueryRecord":76,"./ResourceRecord":78,"./Responder":79,"./ServiceType":82,"./constants":85,"./debug":87,"./misc":90,"./sleep":92,"./validate":93,"os":26,"path":27,"timers":54}],66:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

var misc = require('./misc');
var ServiceType = require('./ServiceType');
var EventEmitter = require('./EventEmitter');

var ServiceResolver = require('./ServiceResolver');
var NetworkInterface = require('./NetworkInterface');
var Query = require('./Query');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var RType = require('./constants').RType;
var STATE = { STOPPED: 'stopped', STARTED: 'started' };

/**
 * Creates a new Browser
 *
 * @emits 'serviceUp'
 * @emits 'serviceChanged'
 * @emits 'serviceDown'
 * @emits 'error'
 *
 * @param {ServiceType|Object|String|Array} type - the service to browse
 * @param {Object} [options]
 */
function Browser(type) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!(this instanceof Browser)) return new Browser(type, options);
  EventEmitter.call(this);

  // convert argument ServiceType to validate it (might throw)
  var serviceType = type instanceof ServiceType ? type : new ServiceType(type);

  // can't search for multiple subtypes at the same time
  if (serviceType.subtypes.length > 1) {
    throw new Error('Too many subtypes. Can only browse one at a time.');
  }

  this._id = serviceType.toString();
  debug('Creating new browser for "' + this._id + '"');

  this._resolvers = {}; // active service resolvers (when browsing services)
  this._serviceTypes = {}; // active service types (when browsing service types)
  this._protocol = serviceType.protocol;
  this._serviceName = serviceType.name;
  this._subtype = serviceType.subtypes[0];
  this._isWildcard = serviceType.isEnumerator;
  this._domain = options.domain || 'local.';
  this._maintain = 'maintain' in options ? options.maintain : true;
  this._resolve = 'resolve' in options ? options.resolve : true;
  this._interface = NetworkInterface.get(options.interface);
  this._state = STATE.STOPPED;

  // emitter used to stop child queries instead of holding onto a reference
  // for each one
  this._offswitch = new EventEmitter();
}

Browser.prototype = Object.create(EventEmitter.prototype);
Browser.prototype.constructor = Browser;

/**
 * Starts browser
 * @return {this}
 */
Browser.prototype.start = function () {
  var _this = this;

  if (this._state === STATE.STARTED) {
    debug('Browser already started!');
    return this;
  }

  debug('Starting browser for "' + this._id + '"');
  this._state = STATE.STARTED;

  // listen for fatal errors on interface
  this._interface.using(this).once('error', this._onError);

  this._interface.bind().then(function () {
    return _this._startQuery();
  }).catch(function (err) {
    return _this._onError(err);
  });

  return this;
};

/**
 * Stops browser.
 *
 * Browser shutdown has to:
 *   - shut down all child service resolvers (they're no longer needed)
 *   - stop the ongoing browsing queries on all interfaces
 *   - remove all listeners since the browser is down
 *   - deregister from the interfaces so they can shut down if needed
 */
Browser.prototype.stop = function () {
  debug('Stopping browser for "' + this._id + '"');

  this._interface.removeListenersCreatedBy(this);
  this._interface.stopUsing();

  debug('Sending stop signal to active queries');
  this._offswitch.emit('stop');

  // because resolver.stop()'s will trigger serviceDown:
  this.removeAllListeners('serviceDown');
  Object.values(this._resolvers).forEach(function (resolver) {
    return resolver.stop();
  });

  this._state = STATE.STOPPED;
  this._resolvers = {};
  this._serviceTypes = {};
};

/**
 * Get a list of currently available services
 * @return {Objects[]}
 */
Browser.prototype.list = function () {
  // if browsing service types
  if (this._isWildcard) {
    return Object.values(this._serviceTypes);
  }

  return Object.values(this._resolvers).filter(function (resolver) {
    return resolver.isResolved();
  }).map(function (resolver) {
    return resolver.service();
  });
};

/**
 * Error handler
 * @emits 'error'
 */
Browser.prototype._onError = function (err) {
  debug('Error on "' + this._id + '", shutting down. Got: \n' + err);

  this.stop();
  this.emit('error', err);
};

/**
 * Starts the query for either services (like each available printer)
 * or service types using enumerator (listing all mDNS service on a network).
 * Queries are sent out on each network interface the browser uses.
 */
Browser.prototype._startQuery = function () {
  var name = misc.fqdn(this._serviceName, this._protocol, this._domain);

  if (this._subtype) name = misc.fqdn(this._subtype, '_sub', name);

  var question = { name: name, qtype: RType.PTR };

  var answerHandler = this._isWildcard ? this._addServiceType.bind(this) : this._addService.bind(this);

  // start sending continuous, ongoing queries for services
  new Query(this._interface, this._offswitch).add(question).on('answer', answerHandler).start();
};

/**
 * Answer handler for service types. Adds type and alerts user.
 *
 * @emits 'serviceUp' with new service types
 * @param {ResourceRecord} answer
 */
Browser.prototype._addServiceType = function (answer) {
  var name = answer.PTRDName;

  if (this._state === STATE.STOPPED) return debug.v('Already stopped, ignoring');
  if (answer.ttl === 0) return debug.v('TTL=0, ignoring');
  if (this._serviceTypes[name]) return debug.v('Already found, ignoring');

  debug('Found new service type: "' + name + '"');

  var _misc$parse = misc.parse(name),
      service = _misc$parse.service,
      protocol = _misc$parse.protocol;

  // remove any leading underscores for users


  service = service.replace(/^_/, '');
  protocol = protocol.replace(/^_/, '');

  var serviceType = { name: service, protocol: protocol };

  this._serviceTypes[name] = serviceType;
  this.emit('serviceUp', serviceType);
};

/**
 * Answer handler for services.
 *
 * New found services cause a ServiceResolve to be created. The resolver
 * parse the additionals and query out for an records needed to fully
 * describe the service (hostname, IP, port, TXT).
 *
 * @emits 'serviceUp'      when a new service is found
 * @emits 'serviceChanged' when a resolved service changes data (IP, etc.)
 * @emits 'serviceDown'    when a resolved service goes down
 *
 * @param {ResourceRecord}   answer        - the record that has service data
 * @param {ResourceRecord[]} [additionals] - other records that might be related
 */
Browser.prototype._addService = function (answer, additionals) {
  var _this2 = this;

  var name = answer.PTRDName;

  if (this._state === STATE.STOPPED) return debug.v('Already stopped, ignoring');
  if (answer.ttl === 0) return debug.v('TTL=0, ignoring');
  if (this._resolvers[name]) return debug.v('Already found, ignoring');

  debug('Found new service: "' + name + '"');

  if (!this._resolve) {
    this.emit('serviceUp', misc.parse(name).instance);
    return;
  }

  var resolver = new ServiceResolver(name, this._interface);
  this._resolvers[name] = resolver;

  resolver.once('resolved', function () {
    debug('Service up');

    // - stop resolvers that dont need to be maintained
    // - only emit 'serviceDown' events once services that have been resolved
    if (!_this2._maintain) {
      resolver.stop();
      _this2._resolvers[name] = null;
    } else {
      resolver.once('down', function () {
        return _this2.emit('serviceDown', resolver.service());
      });
    }

    _this2.emit('serviceUp', resolver.service());
  });

  resolver.on('updated', function () {
    debug('Service updated');
    _this2.emit('serviceChanged', resolver.service());
  });

  resolver.once('down', function () {
    debug('Service down');
    delete _this2._resolvers[name];
  });

  resolver.start(additionals);
};

module.exports = Browser;
}).call(this)}).call(this,"/node_modules/dnssd/lib/Browser.js")
},{"./EventEmitter":69,"./NetworkInterface":72,"./Query":75,"./ServiceResolver":81,"./ServiceType":82,"./constants":85,"./debug":87,"./misc":90,"path":27}],67:[function(require,module,exports){
(function (Buffer){(function (){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Wraps a buffer for easier reading / writing without keeping track of offsets.
 * @class
 *
 * instead of:
 *   buffer.writeUInt8(1, 0);
 *   buffer.writeUInt8(2, 1);
 *   buffer.writeUInt8(3, 2);
 *
 * do:
 *   wrapper.writeUInt8(1);
 *   wrapper.writeUInt8(2);
 *   wrapper.writeUInt8(3);
 */
var BufferWrapper = function () {
  /**
   * @param {Buffer}  [buffer]
   * @param {integer} [position]
   */
  function BufferWrapper(buffer) {
    var position = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

    _classCallCheck(this, BufferWrapper);

    this.buffer = buffer || Buffer.alloc(512);
    this.position = position;
  }

  _createClass(BufferWrapper, [{
    key: 'readUInt8',
    value: function readUInt8() {
      var value = this.buffer.readUInt8(this.position);
      this.position += 1;
      return value;
    }
  }, {
    key: 'writeUInt8',
    value: function writeUInt8(value) {
      this._checkLength(1);
      this.buffer.writeUInt8(value, this.position);
      this.position += 1;
    }
  }, {
    key: 'readUInt16BE',
    value: function readUInt16BE() {
      var value = this.buffer.readUInt16BE(this.position);
      this.position += 2;
      return value;
    }
  }, {
    key: 'writeUInt16BE',
    value: function writeUInt16BE(value) {
      this._checkLength(2);
      this.buffer.writeUInt16BE(value, this.position);
      this.position += 2;
    }
  }, {
    key: 'readUInt32BE',
    value: function readUInt32BE() {
      var value = this.buffer.readUInt32BE(this.position);
      this.position += 4;
      return value;
    }
  }, {
    key: 'writeUInt32BE',
    value: function writeUInt32BE(value) {
      this._checkLength(4);
      this.buffer.writeUInt32BE(value, this.position);
      this.position += 4;
    }
  }, {
    key: 'readUIntBE',
    value: function readUIntBE(len) {
      var value = this.buffer.readUIntBE(this.position, len);
      this.position += len;
      return value;
    }
  }, {
    key: 'writeUIntBE',
    value: function writeUIntBE(value, len) {
      this._checkLength(len);
      this.buffer.writeUIntBE(value, this.position, len);
      this.position += len;
    }
  }, {
    key: 'readString',
    value: function readString(len) {
      var str = this.buffer.toString('utf8', this.position, this.position + len);
      this.position += len;
      return str;
    }
  }, {
    key: 'writeString',
    value: function writeString(str) {
      var len = Buffer.byteLength(str);
      this._checkLength(len);
      this.buffer.write(str, this.position);
      this.position += len;
    }

    /**
     * Returns a sub portion of the wrapped buffer
     * @param  {integer} len
     * @return {Buffer}
     */

  }, {
    key: 'read',
    value: function read(len) {
      var buf = Buffer.alloc(len).fill(0);
      this.buffer.copy(buf, 0, this.position);
      this.position += len;
      return buf;
    }

    /**
     * Writes another buffer onto the wrapped buffer
     * @param {Buffer} buffer
     */

  }, {
    key: 'add',
    value: function add(buffer) {
      this._checkLength(buffer.length);
      buffer.copy(this.buffer, this.position);
      this.position += buffer.length;
    }
  }, {
    key: 'seek',
    value: function seek(position) {
      this.position = position;
    }
  }, {
    key: 'skip',
    value: function skip(len) {
      this.position += len;
    }
  }, {
    key: 'tell',
    value: function tell() {
      return this.position;
    }
  }, {
    key: 'remaining',
    value: function remaining() {
      return this.buffer.length - this.position;
    }
  }, {
    key: 'unwrap',
    value: function unwrap() {
      return this.buffer.slice(0, this.position);
    }
  }, {
    key: '_checkLength',
    value: function _checkLength(len) {
      var needed = len - this.remaining();
      var amount = needed > 512 ? needed * 1.5 : 512;

      if (needed > 0) this._grow(amount);
    }
  }, {
    key: '_grow',
    value: function _grow(amount) {
      this.buffer = Buffer.concat([this.buffer, Buffer.alloc(amount).fill(0)]);
    }
  }, {
    key: 'indexOf',
    value: function indexOf(needle) {
      // limit indexOf search up to current position in buffer, no need to
      // search for stuff after this.position
      var haystack = this.buffer.slice(0, this.position);

      if (!haystack.length || !needle.length) return -1;
      if (needle.length > haystack.length) return -1;

      // use node's indexof if this version has it
      if (typeof Buffer.prototype.indexOf === 'function') {
        return haystack.indexOf(needle);
      }

      // otherwise do naive search
      var maxIndex = haystack.length - needle.length;
      var index = 0;
      var pos = 0;

      for (; index <= maxIndex; index++, pos = 0) {
        while (haystack[index + pos] === needle[pos]) {
          if (++pos === needle.length) return index;
        }
      }

      return -1;
    }

    /**
     * Reads a fully qualified domain name from the buffer following the dns
     * message format / compression style.
     *
     * Basic:
     * Each label is preceded by an uint8 specifying the length of the label,
     * finishing with a 0 which indicates the root label.
     *
     * +---+------+---+--------+---+-----+---+
     * | 3 | wwww | 6 | google | 3 | com | 0 |  -->  www.google.com.
     * +---+------+---+--------+---+-----+---+
     *
     * Compression:
     * A pointer is used to point to the location of the previously written labels.
     * If a length byte is > 192 (0xC0) then it means its a pointer to other
     * labels and not a length marker. The pointer is 2 octets long.
     *
     * +---+------+-------------+
     * | 3 | wwww | 0xC000 + 34 |  -->  www.google.com.
     * +---+------+-------------+
     *                       ^-- the "google.com." part can be found @ offset 34
     *
     * @return {string}
     */

  }, {
    key: 'readFQDN',
    value: function readFQDN() {
      var labels = [];
      var len = void 0,
          farthest = void 0;

      while (this.remaining() >= 0 && (len = this.readUInt8())) {
        // Handle dns compression. If the length is > 192, it means its a pointer.
        // The pointer points to a previous position in the buffer to move to and
        // read from. Pointer (a int16be) = 0xC000 + position
        if (len < 192) {
          labels.push(this.readString(len));
        } else {
          var position = (len << 8) + this.readUInt8() - 0xC000;

          // If a pointer was found, keep track of the farthest position reached
          // (the current position) before following the pointers so we can return
          // to it later after following all the compression pointers
          if (!farthest) farthest = this.position;
          this.seek(position);
        }
      }

      // reset to correct position after following pointers (if any)
      if (farthest) this.seek(farthest);

      return labels.join('.') + '.'; // + root label
    }

    /**
     * Writes a fully qualified domain name
     * Same rules as readFQDN above. Does compression.
     *
     * @param {string} name
     */

  }, {
    key: 'writeFQDN',
    value: function writeFQDN(name) {
      var _this = this;

      // convert name into an array of buffers
      var labels = name.split('.').filter(function (s) {
        return !!s;
      }).map(function (label) {
        var len = Buffer.byteLength(label);
        var buf = Buffer.alloc(1 + len);

        buf.writeUInt8(len, 0);
        buf.write(label, 1);

        return buf;
      });

      // add root label (a single ".") to the end (zero length label = 0)
      labels.push(Buffer.alloc(1));

      // compress
      var compressed = this._getCompressedLabels(labels);
      compressed.forEach(function (label) {
        return _this.add(label);
      });
    }

    /**
     * Finds a compressed version of given labels within the buffer
     *
     * Checks if a sub section has been written before, starting with all labels
     * and removing the first label on each successive search until a match (index)
     * is found, or until NO match is found.
     *
     * Ex:
     *
     * 1st pass: Instance._service._tcp.local
     * 2nd pass: _service._tcp.local
     * 3rd pass: _tcp.local
     *            ^-- found "_tcp.local" @ 34, try to compress more
     *
     * 4th pass: Instance._service.[0xC000 + 34]
     * 5th pass: _service.[0xC000 + 34]
     *            ^-- found "_service.[0xC000 + 34]" @ 52, try to compress more
     *
     * 6th pass: Instance.[0xC000 + 52]
     *
     * Nothing else found, returns [Instance, 0xC000+52]
     *
     * @param  {Buffer[]} labels
     * @return {Buffer[]} - compressed version
     */

  }, {
    key: '_getCompressedLabels',
    value: function _getCompressedLabels(labels) {
      var copy = [].concat(_toConsumableArray(labels));
      var wrapper = this;

      function compress(lastPointer) {
        // re-loop on each compression attempt
        copy.forEach(function (label, index) {
          // if a pointer was found on the last compress call, don't bother trying
          // to find a previous instance of a pointer, it doesn't do any good.
          // no need to change [0xC000 + 54] pointer to a [0xC000 + 23] pointer
          if (lastPointer && label === lastPointer) return;
          if (label.length === 1 && label[0] === 0) return;

          var subset = copy.slice(index);
          var pos = wrapper.indexOf(Buffer.concat(subset));

          if (!!~pos) {
            var pointer = Buffer.alloc(2);
            pointer.writeUInt16BE(0xC000 + pos, 0);

            // drop this label and everything after it (stopping forEach loop)
            // put the pointer there instead
            copy.splice(index, copy.length - index);
            copy.push(pointer);

            compress(pointer); // try to compress some more
          }
        });
      }

      compress();
      return copy;
    }
  }]);

  return BufferWrapper;
}();

module.exports = BufferWrapper;
}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":5}],68:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var os = require('os');
var dgram = require('dgram');

var NetworkInterface = require('./NetworkInterface');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

/**
 * Creates a network interface obj using some ephemeral port like 51254
 * @class
 * @extends NetworkInterface
 *
 * Used for dnssd.resolve() functions where you only need to send a query
 * packet, get an answer, and shut down. (Sending packets from port 5353
 * would indicate a fully compliant responder). Packets sent by these interface
 * objects will be treated as 'legacy' queries by other responders.
 */

var DisposableInterface = function (_NetworkInterface) {
  _inherits(DisposableInterface, _NetworkInterface);

  function DisposableInterface(name, addresses) {
    _classCallCheck(this, DisposableInterface);

    debug('Creating new DisposableInterface on ' + name + ':');

    var _this = _possibleConstructorReturn(this, (DisposableInterface.__proto__ || Object.getPrototypeOf(DisposableInterface)).call(this, name));

    _this._addresses = addresses;
    return _this;
  }

  /**
   * Creates/returns DisposableInterfaces from a name or names of interfaces.
   * Always returns an array of em.
   * @static
   *
   * Ex:
   * > const interfaces = DisposableInterface.createEach('eth0');
   * > const interfaces = DisposableInterface.createEach(['eth0', 'wlan0']);
   *
   * @param  {string|string[]} args
   * @return {DisposableInterface[]}
   */


  _createClass(DisposableInterface, [{
    key: 'bind',
    value: function bind() {
      var _this2 = this;

      return Promise.all(this._addresses.map(function (addr) {
        return _this2._bindSocket(addr);
      })).then(function () {
        debug('Interface ' + _this2._id + ' now bound');
        _this2._isBound = true;
      });
    }
  }, {
    key: '_bindSocket',
    value: function _bindSocket(address) {
      var _this3 = this;

      var isPending = true;

      var promise = new Promise(function (resolve, reject) {
        var socketType = address.family === 'IPv6' ? 'udp6' : 'udp4';
        var socket = dgram.createSocket({ type: socketType });

        socket.on('error', function (err) {
          if (isPending) reject(err);else _this3._onError(err);
        });

        socket.on('close', function () {
          _this3._onError(new Error('Socket closed unexpectedly'));
        });

        socket.on('message', _this3._onMessage.bind(_this3));

        socket.on('listening', function () {
          var sinfo = socket.address();
          debug(_this3._id + ' listening on ' + sinfo.address + ':' + sinfo.port);

          _this3._sockets.push(socket);
          resolve();
        });

        socket.bind({ address: address.address });
      });

      return promise.then(function () {
        isPending = false;
      });
    }
  }], [{
    key: 'create',
    value: function create(name) {
      var addresses = [{ adderss: '0.0.0.0', family: 'IPv4' }];

      return name ? new DisposableInterface(name, os.networkInterfaces()[name]) : new DisposableInterface('INADDR_ANY', addresses);
    }

    /**
     * Checks if the names are interfaces that exist in os.networkInterfaces()
     * @static
     *
     * @param  {string|string[]} arg - interface name/names
     * @return {boolean}
     */

  }, {
    key: 'isValidName',
    value: function isValidName(name) {
      if (!name || typeof name !== 'string') return false;
      return !!~Object.keys(os.networkInterfaces()).indexOf(name);
    }
  }]);

  return DisposableInterface;
}(NetworkInterface);

module.exports = DisposableInterface;
}).call(this)}).call(this,"/node_modules/dnssd/lib/DisposableInterface.js")
},{"./NetworkInterface":72,"./debug":87,"dgram":1,"os":26,"path":27}],69:[function(require,module,exports){
'use strict';

var EventEmitter = require('events').EventEmitter;

/**
 * Node EventEmitter + some convenience methods
 * @class
 *
 * This emitter lets you do this:
 *
 * > emitter.using(obj)
 * >   .on('event', obj.handleEvent)
 * >   .on('thing', obj.doThing)
 * >
 * > emitter.removeListenersCreatedBy(obj)
 *
 * Because this doesn't work:
 *
 * > emitter.on('event', this.fn.bind(this))
 * > emitter.removeListener('event', this.fn.bind(this))
 *
 * @param {object} options
 */
function Emitter() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  // this._eventContexts is a map of maps that track of listener/event pairs
  // created by some object / context
  //
  // {
  //   context: {
  //     listener_fn: event type,
  //   },
  // }
  //
  this._eventContexts = new Map();
  this.setMaxListeners(options.maxListeners || 0);
}

Emitter.prototype = Object.create(EventEmitter.prototype);
Emitter.prototype.constructor = Emitter;

/**
 * Adds a listener that is bound to a context
 */
Emitter.prototype.using = function (context) {
  var emitter = this;

  var contextSpecific = {
    on: function on(event, fn) {
      var listener = fn.bind(context);
      var listeners = emitter._eventContexts.get(context) || new Map();

      // add listener/event to context list
      listeners.set(listener, event);
      emitter._eventContexts.set(context, listeners);

      // register event
      emitter.on(event, listener);

      return contextSpecific;
    },
    once: function once(event, fn) {
      var listener = fn.bind(context);
      var listeners = emitter._eventContexts.get(context) || new Map();

      // add listener/event to context list
      listeners.set(listener, event);
      emitter._eventContexts.set(context, listeners);

      // register event
      emitter.once(event, listener);

      return contextSpecific;
    }
  };

  return contextSpecific;
};

Emitter.prototype.off = function (event, fn) {
  this.removeListener(event, fn);
  return this;
};

/**
 * Remove all listeners that were created by / assigned to given context
 */
Emitter.prototype.removeListenersCreatedBy = function (context) {
  var _this = this;

  var listeners = this._eventContexts.get(context) || [];

  listeners.forEach(function (event, fn) {
    return _this.off(event, fn);
  });
  this._eventContexts.delete(context);

  return this;
};

module.exports = Emitter;
},{"events":9}],70:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('./EventEmitter');
var TimerContainer = require('./TimerContainer');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var ONE_SECOND = 1000;

/**
 * @class
 * @extends EventEmitter
 *
 * ExpiringRecordCollection is a set collection for resource records or
 * query records. Uniqueness is determined by a record's hash property,
 * which is a hash of a records name, type, class, and rdata. Records
 * are evicted from the collection as their TTLs expire.
 *
 * Since there may be several records with the same name, type, and class,
 * but different rdata, within a record set (e.g. PTR records for a service
 * type), related records are tracked in this._related.
 *
 * This collection emits 'reissue' and 'expired' events as records TTLs
 * decrease towards expiration. Reissues are emitted at 80%, 85%, 90% and 95%
 * of each records TTL. Re-adding a record refreshes the TTL.
 *
 * @emits 'expired'
 * @emits 'reissue'
 */

var ExpiringRecordCollection = function (_EventEmitter) {
  _inherits(ExpiringRecordCollection, _EventEmitter);

  /**
   * @param {ResourceRecord[]} [records] - optional starting records
   * @param {string} [description]       - optional description for debugging
   */
  function ExpiringRecordCollection(records, description) {
    _classCallCheck(this, ExpiringRecordCollection);

    // make debugging easier, who owns this / what it is
    var _this = _possibleConstructorReturn(this, (ExpiringRecordCollection.__proto__ || Object.getPrototypeOf(ExpiringRecordCollection)).call(this));

    _this._desc = description;

    _this._records = {}; // record.hash: record
    _this._related = {}; // record.namehash: Set() of record hashes
    _this._insertionTime = {}; // record.hash: Date.now()
    _this._timerContainers = {}; // record.hash: new TimerContainer()

    _this.size = 0;
    if (records) _this.addEach(records);
    return _this;
  }

  /**
   * Adds record. Re-added records refresh TTL expiration timers.
   * @param {ResourceRecord} record
   */


  _createClass(ExpiringRecordCollection, [{
    key: 'add',
    value: function add(record) {
      var id = record.hash;
      var group = record.namehash;

      // expire TTL=0 goodbye records instead
      if (record.ttl === 0) return this.setToExpire(record);

      debug.v('#add(): %s', record);
      debug.v('    to: ' + this._desc);

      // only increment size if the record is new
      if (!this._records[id]) this.size++;

      // keep track of related records (same name, type, and class)
      if (!this._related[group]) this._related[group] = new Set();

      // remove any old timers
      if (this._timerContainers[id]) this._timerContainers[id].clear();

      this._records[id] = record;
      this._related[group].add(id);
      this._insertionTime[id] = Date.now();
      this._timerContainers[id] = new TimerContainer();

      // do reissue/expired timers
      this._schedule(record);
    }
  }, {
    key: 'addEach',
    value: function addEach(records) {
      var _this2 = this;

      records.forEach(function (record) {
        return _this2.add(record);
      });
    }
  }, {
    key: 'has',
    value: function has(record) {
      return Object.hasOwnProperty.call(this._records, record.hash);
    }

    /**
     * Checks if a record was added to the collection within a given range
     *
     * @param  {ResourceRecord} record
     * @param  {number}         range - in *seconds*
     * @return {boolean}
     */

  }, {
    key: 'hasAddedWithin',
    value: function hasAddedWithin(record, range) {
      var then = this._insertionTime[record.hash];

      return Number(parseFloat(then)) === then && range * ONE_SECOND >= Date.now() - then;
    }

    /**
     * Returns a *clone* of originally added record that matches requested record.
     * The clone's TTL is reduced to the current TTL. A clone is used so the
     * original record's TTL isn't modified.
     *
     * @param  {ResourceRecord} record
     * @return {ResourceRecord|undefined}
     */

  }, {
    key: 'get',
    value: function get(record) {
      if (!this.has(record)) return undefined;

      var then = this._insertionTime[record.hash];
      var elapsed = ~~((Date.now() - then) / ONE_SECOND);
      var clone = record.clone();

      clone.ttl -= elapsed;

      return clone;
    }

    /**
     * @emits 'expired' w/ the expiring record
     */

  }, {
    key: 'delete',
    value: function _delete(record) {
      if (!this.has(record)) return;

      var id = record.hash;
      var group = record.namehash;

      this.size--;
      this._timerContainers[id].clear();

      delete this._records[id];
      delete this._insertionTime[id];
      delete this._timerContainers[id];

      if (this._related[group]) this._related[group].delete(id);

      debug.v('deleting: %s', record);
      debug.v('    from: ' + this._desc);

      this.emit('expired', record);
    }

    /**
     * Deletes all records, clears all timers, resets size to 0
     */

  }, {
    key: 'clear',
    value: function clear() {
      debug.v('#clear()');

      this.removeAllListeners();
      Object.values(this._timerContainers).forEach(function (timers) {
        return timers.clear();
      });

      this.size = 0;
      this._records = {};
      this._related = {};
      this._insertionTime = {};
      this._timerContainers = {};
    }

    /**
     * Sets record to be deleted in 1s, but doesn't immediately delete it
     */

  }, {
    key: 'setToExpire',
    value: function setToExpire(record) {
      var _this3 = this;

      // can't expire unknown records
      if (!this.has(record)) return;

      // don't reset expire timer if this gets called again, say due to
      // repeated goodbyes. only one timer (expire) would be set in this case
      if (this._timerContainers[record.hash].count() === 1) return;

      debug.v('#setToExpire(): %s', record);
      debug.v('            on: ' + this._desc);

      this._timerContainers[record.hash].clear();
      this._timerContainers[record.hash].set(function () {
        return _this3.delete(record);
      }, ONE_SECOND);
    }

    /**
     * Flushes any other records that have the same name, class, and type
     * from the collection *if* the records have been in the collection
     * longer than 1s.
     */

  }, {
    key: 'flushRelated',
    value: function flushRelated(record) {
      var _this4 = this;

      // only flush records that have cache-flush bit set
      if (!record.isUnique) return;

      this._getRelatedRecords(record.namehash).forEach(function (related) {
        // can't flush itself
        if (related.equals(record)) return;

        // only flush records added more than 1s ago
        if (!_this4.hasAddedWithin(related, 1)) _this4.setToExpire(related);
      });
    }

    /**
     * Records with original TTLs (not reduced ttl clones)
     */

  }, {
    key: 'toArray',
    value: function toArray() {
      return Object.values(this._records);
    }

    /**
     * Checks if collection contains any other records with the same name, type,
     * and class but different rdata. Non-unique records always return false & a
     * record can't conflict with itself
     *
     * @param  {ResourceRecord} record
     * @return {boolean}
     */

  }, {
    key: 'hasConflictWith',
    value: function hasConflictWith(record) {
      if (!record.isUnique) return false;

      return !!this._getRelatedRecords(record.namehash).filter(function (related) {
        return !related.equals(record);
      }).length;
    }

    /**
     * Finds any records in collection that matches name, type, and class of a
     * given query. Rejects any records with a TTL below the cutoff percentage.
     * Returns clones of records to prevent changes to original objects.
     *
     * @param  {QueryRecord} query
     * @param  {number}      [cutoff] - percentage, 0.0 - 1.0
     * @return {ResourceRecords[]}
     */

  }, {
    key: 'find',
    value: function find(query) {
      var cutoff = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.25;

      debug.v('#find(): "' + query.name + '" type: ' + query.qtype);
      debug.v('     in: ' + this._desc);

      return this._filterTTL(this._getRelatedRecords(query.namehash), cutoff);
    }

    /**
     * Gets all any records in collection with a TTL above the cutoff percentage.
     * Returns clones of records to prevent changes to original objects.
     *
     * @param  {number} [cutoff] - percentage, 0.0 - 1.0
     * @return {ResouceRecords[]}
     */

  }, {
    key: 'getAboveTTL',
    value: function getAboveTTL() {
      var cutoff = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0.25;

      debug.v('#getAboveTTL(): %' + cutoff * 100);
      return this._filterTTL(this.toArray(), cutoff);
    }

    /**
     * Gets records that have same name, type, and class.
     */

  }, {
    key: '_getRelatedRecords',
    value: function _getRelatedRecords(namehash) {
      var _this5 = this;

      return this._related[namehash] && this._related[namehash].size ? [].concat(_toConsumableArray(this._related[namehash])).map(function (id) {
        return _this5._records[id];
      }) : [];
    }

    /**
     * Filters given records by their TTL.
     * Returns clones of records to prevent changes to original objects.
     *
     * @param  {ResouceRecords[]} records
     * @param  {number}           cutoff - percentage, 0.0 - 1.0
     * @return {ResouceRecords[]}
     */

  }, {
    key: '_filterTTL',
    value: function _filterTTL(records, cutoff) {
      var _this6 = this;

      return records.reduce(function (result, record) {
        var then = _this6._insertionTime[record.hash];
        var elapsed = ~~((Date.now() - then) / ONE_SECOND);
        var percent = (record.ttl - elapsed) / record.ttl;

        debug.v('└── %s @ %d%', record, ~~(percent * 100));

        if (percent >= cutoff) {
          var clone = record.clone();
          clone.ttl -= elapsed;
          result.push(clone);
        }

        return result;
      }, []);
    }

    /**
     * Sets expiration/reissue timers for a record.
     *
     * Sets expiration at end of TTL.
     * Sets reissue events at 80%, 85%, 90%, 95% of records TTL, plus a random
     * extra 0-2%. (see rfc)
     *
     * @emits 'reissue' w/ the record that needs to be refreshed
     *
     * @param {ResouceRecords} record
     */

  }, {
    key: '_schedule',
    value: function _schedule(record) {
      var _this7 = this;

      var id = record.hash;
      var ttl = record.ttl * ONE_SECOND;

      var expired = function expired() {
        return _this7.delete(record);
      };
      var reissue = function reissue() {
        return _this7.emit('reissue', record);
      };
      var random = function random(min, max) {
        return Math.random() * (max - min) + min;
      };

      this._timerContainers[id].setLazy(reissue, ttl * random(0.80, 0.82));
      this._timerContainers[id].setLazy(reissue, ttl * random(0.85, 0.87));
      this._timerContainers[id].setLazy(reissue, ttl * random(0.90, 0.92));
      this._timerContainers[id].setLazy(reissue, ttl * random(0.95, 0.97));
      this._timerContainers[id].set(expired, ttl);
    }
  }]);

  return ExpiringRecordCollection;
}(EventEmitter);

module.exports = ExpiringRecordCollection;
}).call(this)}).call(this,"/node_modules/dnssd/lib/ExpiringRecordCollection.js")
},{"./EventEmitter":69,"./TimerContainer":84,"./debug":87,"path":27}],71:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * const mutex = new Mutex();
 *
 * function limitMe() {
 *   mutex.lock((unlock) => {
 *     asyncFn().then(unlock);
 *   });
 * }
 *
 * limitMe();
 * limitMe(); // <-- will wait for first call to finish & unlock
 *
 */
var Mutex = function () {
  function Mutex() {
    _classCallCheck(this, Mutex);

    this._queue = [];
    this.locked = false;
  }

  _createClass(Mutex, [{
    key: "lock",
    value: function lock(fn) {
      var _this = this;

      var unlock = function unlock() {
        var nextFn = _this._queue.shift();

        if (nextFn) nextFn(unlock);else _this.locked = false;
      };

      if (!this.locked) {
        this.locked = true;
        fn(unlock);
      } else {
        this._queue.push(fn);
      }
    }
  }]);

  return Mutex;
}();

module.exports = Mutex;
},{}],72:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var os = require('os');
var dgram = require('dgram');

var Packet = require('./Packet');

var EventEmitter = require('./EventEmitter');
var ExpiringRecordCollection = require('./ExpiringRecordCollection');
var Mutex = require('./Mutex');
var misc = require('./misc');
var hex = require('./hex');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var MDNS_PORT = 5353;
var MDNS_ADDRESS = { IPv4: '224.0.0.251', IPv6: 'FF02::FB' };

/**
 * IP should be considered as internal when:
 * ::1 - IPv6  loopback
 * fc00::/8
 * fd00::/8
 * fe80::/8
 * 10.0.0.0    -> 10.255.255.255  (10/8 prefix)
 * 127.0.0.0   -> 127.255.255.255 (127/8 prefix)
 * 172.16.0.0  -> 172.31.255.255  (172.16/12 prefix)
 * 192.168.0.0 -> 192.168.255.255 (192.168/16 prefix)
 *
 */
function isLocal(ip) {
  // IPv6
  if (!!~ip.indexOf(':')) {
    return (/^::1$/.test(ip) || /^fe80/i.test(ip) || /^fc[0-9a-f]{2}/i.test(ip) || /^fd[0-9a-f]{2}/i.test(ip)
    );
  }

  // IPv4
  var parts = ip.split('.').map(function (n) {
    return parseInt(n, 10);
  });

  return parts[0] === 10 || parts[0] === 192 && parts[1] === 168 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

function isIPv4(ip) {
  return (/(?:[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$)/.test(ip)
  );
}

function findInterfaceName(address) {
  var interfaces = os.networkInterfaces();

  return Object.keys(interfaces).find(function (name) {
    return interfaces[name].some(function (addr) {
      return addr.address === address;
    });
  });
}

/**
 * Maps interface names to a previously created NetworkInterfaces
 */
var activeInterfaces = {};

/**
 * Creates a new NetworkInterface
 * @class
 * @extends EventEmitter
 *
 * @param {string} name
 */
function NetworkInterface(name, address) {
  this._id = name || 'INADDR_ANY';
  this._multicastAddr = address;

  debug('Creating new NetworkInterface on `%s`', this._id);
  EventEmitter.call(this);

  // socket binding
  this._usingMe = 0;
  this._isBound = false;
  this._sockets = [];
  this._mutex = new Mutex();

  // incoming / outgoing records
  this.cache = new ExpiringRecordCollection([], this._id + '\'s cache');
  this._history = new ExpiringRecordCollection([], this._id + '\'s history');

  // outgoing packet buffers (debugging)
  this._buffers = [];
}

NetworkInterface.prototype = Object.create(EventEmitter.prototype);
NetworkInterface.prototype.constructor = NetworkInterface;

/**
 * Creates/returns NetworkInterfaces from a name or address of interface.
 * Active interfaces get reused.
 *
 * @static
 *
 * Ex:
 * > const interfaces = NetworkInterface.get('eth0');
 * > const interfaces = NetworkInterface.get('111.222.333.444');
 *
 * @param  {string} arg
 * @return {NetworkInterface}
 */
NetworkInterface.get = function get() {
  var specific = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

  // doesn't set a specific multicast send address
  if (!specific) {
    if (!activeInterfaces.any) {
      activeInterfaces.any = new NetworkInterface();
    }

    return activeInterfaces.any;
  }

  // sets multicast send address
  var name = void 0;
  var address = void 0;

  // arg is an IP address
  if (isIPv4(specific)) {
    name = findInterfaceName(specific);
    address = specific;
    // arg is the name of an interface
  } else {
    if (!os.networkInterfaces()[specific]) {
      throw new Error('Can\'t find an interface named \'' + specific + '\'');
    }

    name = specific;
    address = os.networkInterfaces()[name].find(function (a) {
      return a.family === 'IPv4';
    }).address;
  }

  if (!name || !address) {
    throw new Error('Interface matching \'' + specific + '\' not found');
  }

  if (!activeInterfaces[name]) {
    activeInterfaces[name] = new NetworkInterface(name, address);
  }

  return activeInterfaces[name];
};

/**
 * Returns the name of the loopback interface (if there is one)
 * @static
 */
NetworkInterface.getLoopback = function getLoopback() {
  var interfaces = os.networkInterfaces();

  return Object.keys(interfaces).find(function (name) {
    var addresses = interfaces[name];
    return addresses.every(function (address) {
      return address.internal;
    });
  });
};

/**
 * Binds each address the interface uses to the multicast address/port
 * Increments `this._usingMe` to keep track of how many browsers/advertisements
 * are using it.
 */
NetworkInterface.prototype.bind = function () {
  var _this = this;

  return new Promise(function (resolve, reject) {
    _this._usingMe++;

    // prevent concurrent binds:
    _this._mutex.lock(function (unlock) {
      if (_this._isBound) {
        unlock();
        resolve();
        return;
      }

      // create & bind socket
      _this._bindSocket().then(function () {
        debug('Interface ' + _this._id + ' now bound');
        _this._isBound = true;
        unlock();
        resolve();
      }).catch(function (err) {
        _this._usingMe--;
        reject(err);
        unlock();
      });
    });
  });
};

NetworkInterface.prototype._bindSocket = function () {
  var _this2 = this;

  var isPending = true;

  var promise = new Promise(function (resolve, reject) {
    var socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    socket.on('error', function (err) {
      if (isPending) reject(err);else _this2._onError(err);
    });

    socket.on('close', function () {
      _this2._onError(new Error('Socket closed unexpectedly'));
    });

    socket.on('message', function (msg, rinfo) {
      _this2._onMessage(msg, rinfo);
    });

    socket.on('listening', function () {
      var _ref;

      var sinfo = socket.address();
      debug(_this2._id + ' listening on ' + sinfo.address + ':' + sinfo.port);

      // Make sure loopback is set to ensure we can communicate with any other
      // responders on the same machine. IP_MULTICAST_LOOP might default to
      // true so this may be redundant on some platforms.
      socket.setMulticastLoopback(true);
      socket.setTTL(255);

      // set a specific multicast interface to use for outgoing packets
      if (_this2._multicastAddr) socket.setMulticastInterface(_this2._multicastAddr);

      // add membership on each unique IPv4 interface address
      var addresses = (_ref = []).concat.apply(_ref, _toConsumableArray(Object.values(os.networkInterfaces()))).filter(function (addr) {
        return addr.family === 'IPv4';
      }).map(function (addr) {
        return addr.address;
      });

      [].concat(_toConsumableArray(new Set(addresses))).forEach(function (address) {
        try {
          socket.addMembership(MDNS_ADDRESS.IPv4, address);
        } catch (e) {
          console.log('OUCH! - could not add membership to interface ' + address, e);
        }
      });

      _this2._sockets.push(socket);
      resolve();
    });

    socket.bind({ address: '0.0.0.0', port: MDNS_PORT });
  });

  return promise.then(function () {
    isPending = false;
  });
};

/**
 * Handles incoming messages.
 *
 * @emtis 'answer' w/ answer packet
 * @emtis 'probe' w/ probe packet
 * @emtis 'query' w/ query packet
 *
 * @param  {Buffer} msg
 * @param  {object} origin
 */
NetworkInterface.prototype._onMessage = function (msg, origin) {
  if (debug.verbose.isEnabled) {
    debug.verbose('Incoming message on interface %s from %s:%s \n\n%s\n\n', this._id, origin.address, origin.port, hex.view(msg));
  }

  var packet = new Packet(msg, origin);

  if (debug.isEnabled) {
    var index = this._buffers.findIndex(function (buf) {
      return msg.equals(buf);
    });
    var address = origin.address,
        port = origin.port;


    if (index !== -1) {
      this._buffers.splice(index, 1); // remove buf @index
      debug(address + ':' + port + ' -> ' + this._id + ' *** Ours: \n\n<-- ' + packet + '\n\n');
    } else {
      debug(address + ':' + port + ' -> ' + this._id + ' \n\n<-- ' + packet + '\n\n');
    }
  }

  if (!packet.isValid()) return debug('Bad packet, ignoring');

  // must silently ignore responses where source UDP port is not 5353
  if (packet.isAnswer() && origin.port === 5353) {
    this._addToCache(packet);
    this.emit('answer', packet);
  }

  if (packet.isProbe() && origin.port === 5353) {
    this.emit('probe', packet);
  }

  if (packet.isQuery()) {
    this.emit('query', packet);
  }
};

/**
 * Adds records from incoming packet to interface cache. Also flushes records
 * (sets them to expire in 1s) if the cache flush bit is set.
 */
NetworkInterface.prototype._addToCache = function (packet) {
  var _this3 = this;

  debug('Adding records to interface (%s) cache', this._id);

  var incomingRecords = [].concat(_toConsumableArray(packet.answers), _toConsumableArray(packet.additionals));

  incomingRecords.forEach(function (record) {
    if (record.isUnique) _this3.cache.flushRelated(record);
    _this3.cache.add(record);
  });
};

NetworkInterface.prototype.hasRecentlySent = function (record) {
  var range = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

  return this._history.hasAddedWithin(record, range);
};

/**
 * Send the packet on each socket for this interface.
 * If no unicast destination address/port is given the packet is sent to the
 * multicast address/port.
 */
NetworkInterface.prototype.send = function (packet, destination, callback) {
  var _this4 = this;

  if (!this._isBound) {
    debug('Interface not bound yet, can\'t send');
    return callback && callback();
  }

  if (packet.isEmpty()) {
    debug('Packet is empty, not sending');
    return callback && callback();
  }

  if (destination && !isLocal(destination.address)) {
    debug('Destination ' + destination.address + ' not link-local, not sending');
    return callback && callback();
  }

  if (packet.isAnswer() && !destination) {
    debug.verbose('Adding outgoing multicast records to history');
    this._history.addEach([].concat(_toConsumableArray(packet.answers), _toConsumableArray(packet.additionals)));
  }

  var done = callback && misc.after_n(callback, this._sockets.length);
  var buf = packet.toBuffer();

  // send packet on each socket
  this._sockets.forEach(function (socket) {
    var family = socket.address().family;
    var port = destination ? destination.port : MDNS_PORT;
    var address = destination ? destination.address : MDNS_ADDRESS[family];

    // don't try to send to IPv4 on an IPv6 & vice versa
    if (destination && family === 'IPv4' && !isIPv4(address) || destination && family === 'IPv6' && isIPv4(address)) {
      debug('Mismatched sockets, (' + family + ' to ' + destination.address + '), skipping');
      return;
    }

    // the outgoing list _should_ only have a few at any given time
    // but just in case, make sure it doesn't grow indefinitely
    if (debug.isEnabled && _this4._buffers.length < 10) _this4._buffers.push(buf);

    debug('%s (%s) -> %s:%s\n\n--> %s\n\n', _this4._id, family, address, port, packet);

    socket.send(buf, 0, buf.length, port, address, function (err) {
      if (!err) return done && done();

      // any other error goes to the handler:
      if (err.code !== 'EMSGSIZE') return _this4._onError(err);

      // split big packets up and resend:
      debug('Packet too big to send, splitting');

      packet.split().forEach(function (half) {
        _this4.send(half, destination, callback);
      });
    });
  });
};

/**
 * Browsers/Advertisements use this instead of using stop()
 */
NetworkInterface.prototype.stopUsing = function () {
  this._usingMe--;
  if (this._usingMe <= 0) this.stop();
};

NetworkInterface.prototype.stop = function () {
  debug('Shutting down ' + this._id + '...');

  this._sockets.forEach(function (socket) {
    socket.removeAllListeners(); // do first to prevent close events
    try {
      socket.close();
    } catch (e) {/**/}
  });

  this.cache.clear();
  this._history.clear();

  this._usingMe = 0;
  this._isBound = false;
  this._sockets = [];
  this._buffers = [];

  debug('Done.');
};

NetworkInterface.prototype._onError = function (err) {
  debug(this._id + ' had an error: ' + err + '\n' + err.stack);

  this.stop();
  this.emit('error', err);
};

module.exports = NetworkInterface;
}).call(this)}).call(this,"/node_modules/dnssd/lib/NetworkInterface.js")
},{"./EventEmitter":69,"./ExpiringRecordCollection":70,"./Mutex":71,"./Packet":73,"./debug":87,"./hex":89,"./misc":90,"dgram":1,"os":26,"path":27}],73:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var os = require('os');
var util = require('util');

var misc = require('./misc');
var QueryRecord = require('./QueryRecord');
var ResourceRecord = require('./ResourceRecord');
var BufferWrapper = require('./BufferWrapper');
var RecordCollection = require('./RecordCollection');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

/**
 * mDNS Packet
 * @class
 *
 * Make new empty packets with `new Packet()`
 * or parse a packet from a buffer with `new Packet(buffer)`
 *
 * Check if there were problems parsing a buffer by checking `packet.isValid()`
 * isValid() will return false if buffer parsing failed or if something is wrong
 * with the packet's header.
 *
 */

var Packet = function () {
  /**
   * @param  {Buffer} [buffer] - optional buffer to parse
   * @param  {Object} [origin] - optional msg info
   */
  function Packet(buffer) {
    var origin = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Packet);

    this.header = {
      ID: 0,
      QR: 0,
      OPCODE: 0,
      AA: 0,
      TC: 0,
      RD: 0,
      RA: 0,
      Z: 0,
      AD: 0,
      CD: 0,
      RCODE: 0,
      QDCount: 0,
      ANCount: 0,
      NSCount: 0,
      ARCount: 0
    };

    this.questions = [];
    this.answers = [];
    this.authorities = [];
    this.additionals = [];

    this.origin = {
      address: origin.address,
      port: origin.port
    };

    // wrap parse in try/catch because it could throw
    // if it does, make packet.isValid() always return false
    if (buffer) {
      try {
        this.parseBuffer(buffer);
      } catch (err) {
        debug('Packet parse error: ' + err + ' \n' + err.stack);
        this.isValid = function () {
          return false;
        };
      }
    }
  }

  _createClass(Packet, [{
    key: 'parseBuffer',
    value: function parseBuffer(buffer) {
      var wrapper = new BufferWrapper(buffer);

      var readQuestion = function readQuestion() {
        return QueryRecord.fromBuffer(wrapper);
      };
      var readRecord = function readRecord() {
        return ResourceRecord.fromBuffer(wrapper);
      };

      this.header = this.parseHeader(wrapper);

      this.questions = misc.map_n(readQuestion, this.header.QDCount);
      this.answers = misc.map_n(readRecord, this.header.ANCount);
      this.authorities = misc.map_n(readRecord, this.header.NSCount);
      this.additionals = misc.map_n(readRecord, this.header.ARCount);
    }

    /**
     * Header:
     * +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
     * | 1  | 2  | 3  | 4  | 5  | 6  | 7  | 8  | 9  | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
     * +----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+----+
     * |                                 Identifier                                    |
     * +----+-------------------+----+----+----+----+----+----+----+-------------------+
     * | QR |      OPCODE       | AA | TC | RD | RA | Z  | AD | CD |       RCODE       |
     * +----+-------------------+----+----+----+----+----+----+----+-------------------+
     * |                        QDCount (Number of questions)                          |
     * +-------------------------------------------------------------------------------+
     * |                      ANCount (Number of answer records)                       |
     * +-------------------------------------------------------------------------------+
     * |                     NSCount (Number of authority records)                     |
     * +-------------------------------------------------------------------------------+
     * |                    ARCount (Number of additional records)                     |
     * +-------------------------------------------------------------------------------+
     *
     * For mDNS, RD, RA, Z, AD and CD MUST be zero on transmission, and MUST be ignored
     * on reception. Responses with OPCODEs or RCODEs =/= 0 should be silently ignored.
     */

  }, {
    key: 'parseHeader',
    value: function parseHeader(wrapper) {
      var header = {};

      header.ID = wrapper.readUInt16BE();
      var flags = wrapper.readUInt16BE();

      header.QR = (flags & 1 << 15) >> 15;
      header.OPCODE = (flags & 0xF << 11) >> 11;
      header.AA = (flags & 1 << 10) >> 10;
      header.TC = (flags & 1 << 9) >> 9;
      header.RD = 0;
      header.RA = 0;
      header.Z = 0;
      header.AD = 0;
      header.CD = 0;
      header.RCODE = flags & 0xF;

      header.QDCount = wrapper.readUInt16BE();
      header.ANCount = wrapper.readUInt16BE();
      header.NSCount = wrapper.readUInt16BE();
      header.ARCount = wrapper.readUInt16BE();

      return header;
    }
  }, {
    key: 'toBuffer',
    value: function toBuffer() {
      var wrapper = new BufferWrapper();
      var writeRecord = function writeRecord(record) {
        return record.writeTo(wrapper);
      };

      this.writeHeader(wrapper);

      this.questions.forEach(writeRecord);
      this.answers.forEach(writeRecord);
      this.authorities.forEach(writeRecord);
      this.additionals.forEach(writeRecord);

      return wrapper.unwrap();
    }
  }, {
    key: 'writeHeader',
    value: function writeHeader(wrapper) {
      var flags = 0 + (this.header.QR << 15) + (this.header.OPCODE << 11) + (this.header.AA << 10) + (this.header.TC << 9) + (this.header.RD << 8) + (this.header.RA << 7) + (this.header.Z << 6) + (this.header.AD << 5) + (this.header.CD << 4) + this.header.RCODE;

      wrapper.writeUInt16BE(this.header.ID);
      wrapper.writeUInt16BE(flags);

      wrapper.writeUInt16BE(this.questions.length); // QDCount
      wrapper.writeUInt16BE(this.answers.length); // ANCount
      wrapper.writeUInt16BE(this.authorities.length); // NSCount
      wrapper.writeUInt16BE(this.additionals.length); // ARCount
    }
  }, {
    key: 'setQuestions',
    value: function setQuestions(questions) {
      this.questions = questions;
      this.header.QDCount = this.questions.length;
    }
  }, {
    key: 'setAnswers',
    value: function setAnswers(answers) {
      this.answers = answers;
      this.header.ANCount = this.answers.length;
    }
  }, {
    key: 'setAuthorities',
    value: function setAuthorities(authorities) {
      this.authorities = authorities;
      this.header.NSCount = this.authorities.length;
    }
  }, {
    key: 'setAdditionals',
    value: function setAdditionals(additionals) {
      this.additionals = additionals;
      this.header.ARCount = this.additionals.length;
    }
  }, {
    key: 'setResponseBit',
    value: function setResponseBit() {
      this.header.QR = 1; // response
      this.header.AA = 1; // authoritative (all responses must be)
    }
  }, {
    key: 'isValid',
    value: function isValid() {
      return this.header.OPCODE === 0 && this.header.RCODE === 0 && (!this.isAnswer() || this.header.AA === 1); // must be authoritative
    }
  }, {
    key: 'isEmpty',
    value: function isEmpty() {
      return this.isAnswer() ? !this.answers.length // responses have to have answers
      : !this.questions.length; // queries/probes have to have questions
    }
  }, {
    key: 'isLegacy',
    value: function isLegacy() {
      return !!this.origin.port && this.origin.port !== 5353;
    }
  }, {
    key: 'isLocal',
    value: function isLocal() {
      var _ref,
          _this = this;

      return !!this.origin.address && (_ref = []).concat.apply(_ref, _toConsumableArray(Object.values(os.networkInterfaces()))).some(function (_ref2) {
        var address = _ref2.address;
        return address === _this.origin.address;
      });
    }
  }, {
    key: 'isProbe',
    value: function isProbe() {
      return !!(!this.header.QR && this.authorities.length);
    }
  }, {
    key: 'isQuery',
    value: function isQuery() {
      return !!(!this.header.QR && !this.authorities.length);
    }
  }, {
    key: 'isAnswer',
    value: function isAnswer() {
      return !!this.header.QR;
    }
  }, {
    key: 'equals',
    value: function equals(other) {
      return misc.equals(this.header, other.header) && new RecordCollection(this.questions).equals(other.questions) && new RecordCollection(this.answers).equals(other.answers) && new RecordCollection(this.additionals).equals(other.additionals) && new RecordCollection(this.authorities).equals(other.authorities);
    }
  }, {
    key: 'split',
    value: function split() {
      var one = new Packet();
      var two = new Packet();

      one.header = Object.assign({}, this.header);
      two.header = Object.assign({}, this.header);

      if (this.isQuery()) {
        one.header.TC = 1;

        one.setQuestions(this.questions);
        two.setQuestions([]);

        one.setAnswers(this.answers.slice(0, Math.ceil(this.answers.length / 2)));
        two.setAnswers(this.answers.slice(Math.ceil(this.answers.length / 2)));
      }

      if (this.isAnswer()) {
        var _ref3, _ref4;

        one.setAnswers(this.answers.slice(0, Math.ceil(this.answers.length / 2)));
        two.setAnswers(this.answers.slice(Math.ceil(this.answers.length / 2)));

        one.setAdditionals((_ref3 = []).concat.apply(_ref3, _toConsumableArray(one.answers.map(function (a) {
          return a.additionals;
        }))));
        two.setAdditionals((_ref4 = []).concat.apply(_ref4, _toConsumableArray(two.answers.map(function (a) {
          return a.additionals;
        }))));
      }

      // if it can't split packet, just return empties and hope for the best...
      return [one, two];
    }

    /**
     * Makes a nice string for looking at packets. Makes something like:
     *
     * ANSWER
     * ├─┬ Questions[2]
     * │ └── record.local. ANY  QM
     * ├─┬ Answer RRs[1]
     * │ └── record.local. A ...
     * ├─┬ Authority RRs[1]
     * │ └── record.local. A ...
     * └─┬ Additional RRs[1]
     *   └── record.local. A ...
     */

  }, {
    key: 'toString',
    value: function toString() {
      var str = '';

      if (this.isAnswer()) str += misc.bg(' ANSWER ', 'blue', true) + '\n';
      if (this.isProbe()) str += misc.bg(' PROBE ', 'magenta', true) + '\n';
      if (this.isQuery()) str += misc.bg(' QUERY ', 'yellow', true) + '\n';

      var recordGroups = [];
      var aligned = misc.alignRecords(this.questions, this.answers, this.authorities, this.additionals);

      if (this.questions.length) recordGroups.push(['Questions', aligned[0]]);
      if (this.answers.length) recordGroups.push(['Answer RRs', aligned[1]]);
      if (this.authorities.length) recordGroups.push(['Authority RRs', aligned[2]]);
      if (this.additionals.length) recordGroups.push(['Additional RRs', aligned[3]]);

      recordGroups.forEach(function (_ref5, i) {
        var _ref6 = _slicedToArray(_ref5, 2),
            name = _ref6[0],
            records = _ref6[1];

        var isLastSection = i === recordGroups.length - 1;

        // add record group header
        str += util.format('    %s─┬ %s [%s]\n', isLastSection ? '└' : '├', name, records.length);

        // add record strings
        records.forEach(function (record, j) {
          var isLastRecord = j === records.length - 1;

          str += util.format('    %s %s── %s\n', isLastSection ? ' ' : '│', isLastRecord ? '└' : '├', record);
        });
      });

      return str;
    }
  }]);

  return Packet;
}();

module.exports = Packet;
}).call(this)}).call(this,"/node_modules/dnssd/lib/Packet.js")
},{"./BufferWrapper":67,"./QueryRecord":76,"./RecordCollection":77,"./ResourceRecord":78,"./debug":87,"./misc":90,"os":26,"path":27,"util":60}],74:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Packet = require('./Packet');
var QueryRecord = require('./QueryRecord');
var EventEmitter = require('./EventEmitter');
var RecordCollection = require('./RecordCollection');
var TimerContainer = require('./TimerContainer');
var sleep = require('./sleep');
var misc = require('./misc');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var counter = 0;
var uniqueId = function uniqueId() {
  return 'id#' + ++counter;
};

/**
 * Creates a new Probe
 * @class
 * @extends EventEmitter
 *
 * A probe will check if records are unique on a given interface. If they are
 * unique, the probe succeeds and the record name can be used. If any records
 * are found to be not unique, the probe fails and the records need to be
 * renamed.
 *
 * Probes send 3 probe packets out, 250ms apart. If no conflicting answers are
 * received after all 3 have been sent the probe is considered successful.
 *
 * @emits 'complete'
 * @emits 'conflict'
 *
 * @param {NetworkInterface} intf - the interface the probe will work on
 * @param {EventEmitter}     offswitch - emitter used to shut this probe down
 */
function Probe(intf, offswitch) {
  EventEmitter.call(this);

  // id only used for figuring out logs
  this._id = uniqueId();
  debug('Creating new probe (' + this._id + ')');

  this._interface = intf;
  this._offswitch = offswitch;
  this._questions = new RecordCollection();
  this._authorities = new RecordCollection();
  this._bridgeable = new RecordCollection();

  this._isStopped = false;
  this._numProbesSent = 0;
  this._timers = new TimerContainer(this);

  // listen on answers/probes to check for conflicts
  // stop on either the offswitch or an interface error
  intf.using(this).on('answer', this._onAnswer).on('probe', this._onProbe).on('error', this.stop);

  offswitch.using(this).once('stop', this.stop);

  // restart probing process if it was interrupted by sleep
  sleep.using(this).on('wake', this.stop);
}

Probe.prototype = Object.create(EventEmitter.prototype);
Probe.prototype.constructor = Probe;

/**
 * Add unique records to be probed
 * @param {ResourceRecords|ResourceRecords[]} args
 */
Probe.prototype.add = function (args) {
  var _this = this;

  var records = Array.isArray(args) ? args : [args];

  records.forEach(function (record) {
    _this._authorities.add(record);
    _this._questions.add(new QueryRecord({ name: record.name }));
  });

  return this;
};

/**
 * Sets the record set getting probed across all interfaces, not just this one.
 * Membership in the set helps let us know if a record is getting bridged from
 * one interface to another.
 */
Probe.prototype.bridgeable = function (bridgeable) {
  this._bridgeable = new RecordCollection(bridgeable);
  return this;
};

/**
 * Starts probing records.
 * The first probe should be delayed 0-250ms to prevent collisions.
 */
Probe.prototype.start = function () {
  if (this._isStopped) return;

  this._timers.setLazy('next-probe', this._send, misc.random(0, 250));
  return this;
};

/**
 * Stops the probe. Has to remove any timers that might exist because of this
 * probe, like the next queued timer.
 */
Probe.prototype.stop = function () {
  if (this._isStopped) return;

  debug('Probe stopped (' + this._id + ')');
  this._isStopped = true;
  this._timers.clear();

  this._interface.removeListenersCreatedBy(this);
  this._offswitch.removeListenersCreatedBy(this);
  sleep.removeListenersCreatedBy(this);
};

/**
 * Restarts the probing process
 */
Probe.prototype._restart = function () {
  this._numProbesSent = 0;
  this._timers.clear();
  this._send();
};

/**
 * Sends the probe packets. Gets called repeatedly.
 */
Probe.prototype._send = function () {
  var _this2 = this;

  var packet = this._makePacket();

  this._numProbesSent++;
  debug('Sending probe #' + this._numProbesSent + '/3 (' + this._id + ')');

  this._interface.send(packet);

  // Queue next action
  // - if 3 probes have been sent, 750ms with no conflicts, probing is complete
  // - otherwise queue next outgoing probe
  this._timers.setLazy('next-probe', function () {
    _this2._numProbesSent === 3 ? _this2._complete() : _this2._send();
  }, 250);
};

/**
 * Gets called when the probe completes successfully. If the probe finished
 * early without having to send all 3 probes, completeEarly is set to true.
 *
 * @emits 'complete' with true/false
 *
 * @param {boolean} [completedEarly]
 */
Probe.prototype._complete = function (completedEarly) {
  debug('Probe (' + this._id + ') complete, early: ' + !!completedEarly);

  this.stop();
  this.emit('complete', completedEarly);
};

/**
 * Create probe packets. Probe packets are the same as query packets but they
 * have records in the authority section.
 */
Probe.prototype._makePacket = function () {
  var packet = new Packet();

  packet.setQuestions(this._questions.toArray());
  packet.setAuthorities(this._authorities.toArray());

  return packet;
};

/**
 * Handles incoming answer packets from other mDNS responders
 *
 * Any answer that conflicts with one of the proposed records causes a conflict
 * and stops the probe. If the answer packet matches all proposed records exactly,
 * it means someone else has already probed the record set and the probe can
 * finish early.
 *
 * Biggest issue here is A/AAAA answer records from bonjour getting bridged.
 *
 * Note: don't need to worry about *our* bridged interface answers here. Probes
 * within a single responder are synchronized and the responder will not
 * transition into a 'responding' state until all the probes are done.
 *
 * @emits 'conflict' when there is a conflict
 *
 * @param {Packet} packet - the incoming answer packet
 */
Probe.prototype._onAnswer = function (packet) {
  if (this._isStopped) return;

  var incoming = new RecordCollection([].concat(_toConsumableArray(packet.answers), _toConsumableArray(packet.additionals)));

  // if incoming records match the probes records exactly, including rdata,
  // then the record set has already been probed and verified by someone else
  if (incoming.hasEach(this._authorities)) {
    debug('All probe records found in answer, completing early (' + this._id + ')');
    return this._complete(true);
  }

  // check each of our proposed records
  // check if any of the incoming records conflict with the current record
  // check each for a conflict but ignore if we think the record was
  // bridged from another interface (if the record set has the record on
  // some other interface, the packet was probably bridged)

  var conflicts = this._authorities.getConflicts(incoming);
  var hasConflict = conflicts.length && !this._bridgeable.hasEach(conflicts);

  // a conflicting response from an authoritative responder is fatal and means
  // the record set needs to be renamed
  if (hasConflict) {
    debug('Found conflict on incoming records (' + this._id + ')');
    this.stop();
    this.emit('conflict');
  }
};

/**
 * Handles incoming probe packets
 *
 * Checks for conflicts with simultaneous probes (a rare race condition). If
 * the two probes have conflicting data for the same record set, they are
 * compared and the losing probe has to wait 1 second and try again.
 * (See: 8.2.1. Simultaneous Probe Tiebreaking for Multiple Records)
 *
 * Note: this handle will receive this probe's packets too
 *
 * @param {Packet} packet - the incoming probe packet
 */
Probe.prototype._onProbe = function (packet) {
  var _this3 = this;

  if (this._isStopped) return;
  debug('Checking probe for conflicts (' + this._id + ')');

  // Prevent probe from choking on cooperating probe packets in the event that
  // they get bridged over another interface. (Eg: AAAA record from interface 1
  // shouldn't conflict with a bridged AAAA record from interface 2, even though
  // the interfaces have different addresses.) Just ignore simultaneous probes
  // from the same machine and not deal with it.
  if (packet.isLocal()) {
    return debug('Local probe, ignoring (' + this._id + ')');
  }

  // Prep records:
  // - split into groups by record name
  // - uppercase name so they can be compared case-insensitively
  // - sort record array by ascending rrtype
  //
  // {
  //  'NAME1': [records],
  //  'NAME2': [records]
  // }
  var local = {};
  var incoming = {};

  var has = function has(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };

  this._authorities.toArray().forEach(function (r) {
    var key = r.name.toUpperCase();

    if (has(local, key)) local[key].push(r);else local[key] = [r];
  });

  packet.authorities.forEach(function (r) {
    var key = r.name.toUpperCase();

    // only include those that appear in the other group
    if (has(local, key)) {
      if (has(incoming, key)) incoming[key].push(r);else incoming[key] = [r];
    }
  });

  Object.keys(local).forEach(function (key) {
    local[key] = local[key].sort(function (a, b) {
      return a.rrtype - b.rrtype;
    });
  });

  Object.keys(incoming).forEach(function (key) {
    incoming[key] = incoming[key].sort(function (a, b) {
      return a.rrtype - b.rrtype;
    });
  });

  // Look for conflicts in each group of records. IE, if there are records
  // named 'A' and records named 'B', look at each set.  'A' records first,
  // and then 'B' records. Stops at the first conflict.
  var hasConflict = Object.keys(local).some(function (name) {
    if (!incoming[name]) return false;

    return _this3._recordsHaveConflict(local[name], incoming[name]);
  });

  // If this probe is found to be in conflict it has to pause for 1 second
  // before trying again. A legitimate competing probe should have completed
  // by then and can then authoritatively respond to this probe, causing this
  // one to fail.
  if (hasConflict) {
    this._timers.clear();
    this._timers.setLazy('restart', this._restart, 1000);
  }
};

/**
 * Compares two records sets lexicographically
 *
 * Records are compared, pairwise, in their sorted order, until a difference
 * is found or until one of the lists runs out. If no differences are found,
 * and record lists are the same length, then there is no conflict.
 *
 * Returns true if there was a conflict with this probe's records and false
 * if this probe is ok.
 *
 * @param  {ResourceRecords[]} records
 * @param  {ResourceRecords[]} incomingRecords
 * @return {Boolean}
 */
Probe.prototype._recordsHaveConflict = function (records, incomingRecords) {
  debug('Checking for lexicographic conflicts with other probe:');

  var hasConflict = false;
  var pairs = [];

  for (var i = 0; i < Math.max(records.length, incomingRecords.length); i++) {
    pairs.push([records[i], incomingRecords[i]]);
  }

  pairs.forEach(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        record = _ref2[0],
        incoming = _ref2[1];

    debug('Comparing: %s', record);
    debug('     with: %s', incoming);

    // this probe has LESS records than other probe, this probe LOST
    if (typeof record === 'undefined') {
      hasConflict = true;
      return false; // stop comparing
    }

    // this probe has MORE records than other probe, this probe WON
    if (typeof incoming === 'undefined') {
      hasConflict = false;
      return false; // stop comparing
    }

    var comparison = record.compare(incoming);

    // record is lexicographically earlier than incoming, this probe LOST
    if (comparison === -1) {
      hasConflict = true;
      return false; // stop comparing
    }

    // record is lexicographically later than incoming, this probe WON
    if (comparison === 1) {
      hasConflict = false;
      return false; // stop comparing
    }

    // otherwise, if records are lexicographically equal, continue and
    // check the next record pair
  });

  debug('Lexicographic conflict %s', hasConflict ? 'found' : 'not found');

  return hasConflict;
};

module.exports = Probe;
}).call(this)}).call(this,"/node_modules/dnssd/lib/Probe.js")
},{"./EventEmitter":69,"./Packet":73,"./QueryRecord":76,"./RecordCollection":77,"./TimerContainer":84,"./debug":87,"./misc":90,"./sleep":92,"path":27}],75:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var EventEmitter = require('./EventEmitter');
var RecordCollection = require('./RecordCollection');
var ExpiringRecordCollection = require('./ExpiringRecordCollection');
var TimerContainer = require('./TimerContainer');
var Packet = require('./Packet');
var QueryRecord = require('./QueryRecord');
var sleep = require('./sleep');
var misc = require('./misc');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var ONE_SECOND = 1000;
var ONE_HOUR = 60 * 60 * 1000;

var counter = 0;
var uniqueId = function uniqueId() {
  return 'id#' + ++counter;
};

/**
 * Creates a new Query
 * @class
 * @extends EventEmitter
 *
 * A query asks for records on a given interface. Queries can be continuous
 * or non-continuous. Continuous queries will keep asking for records until it
 * gets them all. Non-continuous queries will stop after the first answer packet
 * it receives, whether or not that packet has answers to its questions.
 *
 * @emits 'answer'
 * @emits 'timeout'
 *
 * @param {NetworkInterface} intf - the interface the query will work on
 * @param {EventEmitter}     offswitch - emitter used to shut this query down
 */
function Query(intf, offswitch) {
  EventEmitter.call(this);

  // id only used for figuring out logs
  this._id = uniqueId();
  debug('Creating a new query (' + this._id + ')');

  this._intf = intf;
  this._offswitch = offswitch;
  this._originals = [];
  this._questions = new RecordCollection();
  this._knownAnswers = new ExpiringRecordCollection([], 'Query ' + this._id);
  this._isStopped = false;

  // defaults
  this._delay = misc.random(20, 120);
  this._ignoreCache = false;
  this._isContinuous = true;
  this._timeoutDelay = null;

  // repeated queries increasing by a factor of 2, starting at 1s apart
  this._next = ONE_SECOND;
  this._queuedPacket = null;
  this._timers = new TimerContainer(this);

  // stop on either the offswitch or an interface error
  intf.using(this).once('error', this.stop);
  offswitch.using(this).once('stop', this.stop);

  // remove expired records from known answer list
  intf.cache.using(this).on('expired', this._removeKnownAnswer);

  // restart query (reset delay, etc) after waking from sleep
  sleep.using(this).on('wake', this._restart);
}

Query.prototype = Object.create(EventEmitter.prototype);
Query.prototype.constructor = Query;

Query.prototype.setTimeout = function (timeout) {
  this._timeoutDelay = timeout;
  return this;
};

Query.prototype.continuous = function (bool) {
  this._isContinuous = !!bool;
  return this;
};

Query.prototype.ignoreCache = function (bool) {
  this._ignoreCache = !!bool;
  return this;
};

/**
 * Adds questions to the query, record names/types that need an answer
 *
 * {
 *   name: 'Record Name.whatever.local.',
 *   qtype: 33
 * }
 *
 * If qtype isn't given, the QueryRecord that gets made will default to 255/ANY
 * Accepts one question object or many
 *
 * @param {object|object[]} args
 */
Query.prototype.add = function (args) {
  var _this = this;

  var questions = Array.isArray(args) ? args : [args];
  this._originals = [].concat(_toConsumableArray(questions));

  questions.forEach(function (question) {
    _this._questions.add(new QueryRecord(question));
  });

  return this;
};

/**
 * Starts querying for stuff on the interface. Only should be started
 * after all questions have been added.
 */
Query.prototype.start = function () {
  var _this2 = this;

  // Check the interface's cache for answers before making a network trip
  if (!this._ignoreCache) this._checkCache();

  // If all of the query's questions have been answered via the cache, and no
  // subsequent answers are needed, stop early.
  if (!this._questions.size) {
    debug('All answers found in cache, ending early (' + this._id + ')');
    this.stop();

    return this;
  }

  // Only attach interface listeners now that all questions have been added and
  // the query has been started. Answers shouldn't be processed before the
  // query has been fully set up and started.
  this._intf.using(this).on('answer', this._onAnswer).on('query', this._onQuery);

  // Prepare packet early to allow for duplicate question suppression
  this._queuedPacket = this._makePacket();

  // Only start timeout check AFTER initial delay. Otherwise it could possibly
  // timeout before the query has even been sent.
  this._timers.setLazy('next-query', function () {
    if (_this2._timeoutDelay) _this2._startTimer();
    _this2._send();
  }, this._delay);

  return this;
};

/**
 * Stops the query. Has to remove any timers that might exist because of this
 * query, like this query's timeout, next queued timers, and also any timers
 * inside knownAnswers (ExpiringRecordCollections have timers too).
 */
Query.prototype.stop = function () {
  if (this._isStopped) return;

  debug('Query stopped (' + this._id + ')');
  this._isStopped = true;

  this._timers.clear();
  this._knownAnswers.clear();

  this._intf.removeListenersCreatedBy(this);
  this._offswitch.removeListenersCreatedBy(this);
  this._intf.cache.removeListenersCreatedBy(this);
  sleep.removeListenersCreatedBy(this);
};

/**
 * Resets the query. When waking from sleep the query should clear any known
 * answers and start asking for things again.
 */
Query.prototype._restart = function () {
  var _this3 = this;

  if (this._isStopped) return;

  debug('Just woke up, restarting query (' + this._id + ')');

  this._timers.clear();
  this._questions.clear();
  this._knownAnswers.clear();

  this._originals.forEach(function (question) {
    _this3._questions.add(new QueryRecord(question));
  });

  this._next = ONE_SECOND;
  this._send();
};

/**
 * Sends the query packet. Gets called repeatedly.
 *
 * Each packet is prepared in advance for the next scheduled sending. This way
 * if another query comes in from another mDNS responder with some of the same
 * questions as this query, those questions can be removed from this packet
 * before it gets sent to reduce network chatter.
 *
 * Right before the packet actually gets sent here, any known answers learned
 * from other responders (including those since the last outgoing query) are
 * added to the packet.
 */
Query.prototype._send = function () {
  debug('Sending query (' + this._id + ')');

  // add known answers (with adjusted TTLs) to the outgoing packet
  var packet = this._addKnownAnswers(this._queuedPacket);

  if (!packet.isEmpty()) this._intf.send(packet);else debug('No questions to send, suppressing empty packet (' + this._id + ')');

  // queue next. the packet is prepared in advance for duplicate question checks
  if (this._isContinuous) {
    this._queuedPacket = this._makePacket();
    this._timers.setLazy('next-query', this._send, this._next);

    // each successive query doubles the delay up to one hour
    this._next = Math.min(this._next * 2, ONE_HOUR);
  }
};

/**
 * Create query packet
 *
 * Note this doesn't add known answers. Those need to be added later as they
 * can change in the time between creating the packet and sending it.
 */
Query.prototype._makePacket = function () {
  var packet = new Packet();
  packet.setQuestions(this._questions.toArray());

  return packet;
};

/**
 * Adds current known answers to the packet
 *
 * Known answers are shared records from other responders. They expire from
 * the known answer list as they get too old. Known answers are usually
 * (always?) shared records for questions that have multiple possible answers,
 * like PTRs.
 */
Query.prototype._addKnownAnswers = function (packet) {
  // only known answers whose TTL is >50% of the original should be included
  var knownAnswers = this._knownAnswers.getAboveTTL(0.50);

  // the cache-flush bit should not be set on records in known answer lists
  knownAnswers.forEach(function (answer) {
    answer.isUnique = false;
  });

  packet.setAnswers(knownAnswers);

  return packet;
};

/**
 * Old records should be removed from the known answer list as they expire
 */
Query.prototype._removeKnownAnswer = function (record) {
  if (this._knownAnswers.has(record)) {
    debug('Removing expired record from query\'s known answer list (%s): \n%s', this._id, record);

    this._knownAnswers.delete(record);
  }
};

/**
 * Handles incoming answer packets from other mDNS responders
 *
 * If the incoming packet answers all remaining questions or if this query is
 * a 'non-continuous' query, the handler will stop the query and shut it down.
 *
 * @emits 'answer' event with
 *   - each answer record found, and
 *   - all the other records in the packet
 *
 * @param {packet} packet - the incoming packet
 */
Query.prototype._onAnswer = function (packet) {
  var _this4 = this;

  if (this._isStopped) return;

  var incomingRecords = [].concat(_toConsumableArray(packet.answers), _toConsumableArray(packet.additionals));

  incomingRecords.forEach(function (record) {
    _this4._questions.forEach(function (question) {
      if (!record.canAnswer(question)) return;
      debug('Answer found in response (Query %s): \n%s', _this4._id, record);

      // If the answer is unique (meaning there is only one answer), don't need
      // to keep asking for it and the question can be removed from the pool.
      // If answer is a shared record (meaning there are possibly more than one
      // answer, like with PTR records), add it to the known answer list.
      if (record.isUnique) _this4._questions.delete(question);else _this4._knownAnswers.add(record);

      // emit answer record along with the other record that came with it
      _this4.emit('answer', record, incomingRecords.filter(function (r) {
        return r !== record;
      }));
    });
  });

  // Non-continuous queries get shut down after first response, answers or not.
  // Queries that have had all questions answered get shut down now too.
  if (!this._isContinuous || !this._questions.size) this.stop();
};

/**
 * Handles incoming queries from other responders
 *
 * This is solely used to do duplicate question suppression (7.3). If another
 * responder has asked the same question as one this query is about to send,
 * this query can suppress that question since someone already asked for it.
 *
 * Only modifies the next scheduled query packet (this._queuedPacket).
 *
 * @param {Packet} packet - the incoming query packet
 */
Query.prototype._onQuery = function (packet) {
  if (this._isStopped) return;

  // Make sure we don't suppress ourselves by acting on our own
  // packets getting fed back to us. (this handler will receive this query's
  // outgoing packets too as they come back in on the interface.)
  if (packet.isLocal()) return;

  // can only suppress if the known answer section is empty (see 7.3)
  if (packet.answers.length) return;

  // ignore suppression check on QU questions, only applies to QM questions
  var incoming = packet.questions.filter(function (q) {
    return q.QU === false;
  });
  var outgoing = this._queuedPacket.questions.filter(function (q) {
    return q.QU === false;
  });

  // suppress outgoing questions that also appear in incoming records
  var questions = new RecordCollection(outgoing).difference(incoming).toArray();
  var suppressed = outgoing.filter(function (out) {
    return !~questions.indexOf(out);
  });

  if (suppressed.length) {
    debug('Suppressing duplicate questions (%s): %r', this._id, suppressed);
    this._queuedPacket.setQuestions(questions);
  }
};

/**
 * Check the interface's cache for valid answers to query's questions
 */
Query.prototype._checkCache = function () {
  var _this5 = this;

  this._questions.forEach(function (question) {
    var answers = _this5._intf.cache.find(question);

    answers.forEach(function (record) {
      debug('Answer found in cache (Query %s): \n%s', _this5._id, record);

      if (record.isUnique) _this5._questions.delete(question);else _this5._knownAnswers.add(record);

      _this5.emit('answer', record, answers.filter(function (a) {
        return a !== record;
      }));
    });
  });
};

/**
 * Starts the optional timeout timer
 * @emits `timeout` if answers don't arrive in time
 */
Query.prototype._startTimer = function () {
  var _this6 = this;

  this._timers.set('timeout', function () {
    debug('Query timeout (' + _this6._id + ')');

    _this6.emit('timeout');
    _this6.stop();
  }, this._timeoutDelay);
};

module.exports = Query;
}).call(this)}).call(this,"/node_modules/dnssd/lib/Query.js")
},{"./EventEmitter":69,"./ExpiringRecordCollection":70,"./Packet":73,"./QueryRecord":76,"./RecordCollection":77,"./TimerContainer":84,"./debug":87,"./misc":90,"./sleep":92,"path":27}],76:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var misc = require('./misc');
var hash = require('./hash');

var RClass = require('./constants').RClass;
var RType = require('./constants').RType;
var RNums = require('./constants').RNums;

/**
 * Create/parse query records
 * @class
 *
 * Create a new QueryRecord:
 * > const record = new QueryRecord({name: 'Target.local.'});
 *
 * Parse a QueryRecord from a buffer (a wrapped buffer):
 * > const record = QueryRecord.fromBuffer(wrapper);
 *
 */

var QueryRecord = function () {
  function QueryRecord(fields) {
    _classCallCheck(this, QueryRecord);

    this.name = fields.name;
    this.qtype = fields.qtype || RType.ANY;
    this.qclass = fields.qclass || RClass.IN;
    this.QU = fields.QU || false;

    // for comparing queries and answers:
    this.hash = hash(this.name, this.qtype, this.qclass);
    this.namehash = this.hash;
  }

  /**
   * @param  {BufferWrapper} wrapper
   * @return {QueryRecord}
   */


  _createClass(QueryRecord, [{
    key: 'writeTo',


    /**
     * @param {BufferWrapper} wrapper
     */
    value: function writeTo(wrapper) {
      // flip top bit of qclass to indicate a QU question
      var classField = this.QU ? this.qclass | 0x8000 : this.qclass;

      wrapper.writeFQDN(this.name);
      wrapper.writeUInt16BE(this.qtype);
      wrapper.writeUInt16BE(classField);
    }

    /**
     * Check if a query recrod is the exact same as this one (ANY doesn't count)
     */

  }, {
    key: 'equals',
    value: function equals(queryRecord) {
      return this.hash === queryRecord.hash;
    }

    /**
     * Breaks up the record into an array of parts. Used in misc.alignRecords
     * so stuff can get printed nicely in columns. Only ever used in debugging.
     */

  }, {
    key: 'toParts',
    value: function toParts() {
      var type = RNums[this.qtype] || this.qtype;

      return [this.name, misc.color(type, 'blue'), this.QU ? misc.color('QU', 'yellow') : 'QM'];
    }
  }, {
    key: 'toString',
    value: function toString() {
      return this.toParts().join(' ');
    }
  }], [{
    key: 'fromBuffer',
    value: function fromBuffer(wrapper) {
      var fields = {};
      fields.name = wrapper.readFQDN();
      fields.qtype = wrapper.readUInt16BE();

      // top bit of rrclass field reused as QU/QM bit
      var classBit = wrapper.readUInt16BE();
      fields.qclass = classBit & ~0x8000;
      fields.QU = !!(classBit & 0x8000);

      return new QueryRecord(fields);
    }
  }]);

  return QueryRecord;
}();

module.exports = QueryRecord;
},{"./constants":85,"./hash":88,"./misc":90}],77:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Creates a new RecordCollection
 * @class
 *
 * RecordSet might have been a better name, but a 'record set' has a specific
 * meaning with dns.
 *
 * The 'hash' property of ResourceRecords/QueryRecords is used to keep items in
 * the collection/set unique.
 */
var RecordCollection = function () {
  /**
   * @param {ResorceRecord[]} [records] - optional starting records
   */
  function RecordCollection(records) {
    _classCallCheck(this, RecordCollection);

    this.size = 0;
    this._records = {};

    if (records) this.addEach(records);
  }

  _createClass(RecordCollection, [{
    key: "has",
    value: function has(record) {
      return Object.hasOwnProperty.call(this._records, record.hash);
    }
  }, {
    key: "hasEach",
    value: function hasEach(records) {
      var _this = this;

      return records.every(function (record) {
        return _this.has(record);
      });
    }
  }, {
    key: "hasAny",
    value: function hasAny(records) {
      return !!this.intersection(records).size;
    }

    /**
     * Retrieves the equivalent record from the collection
     *
     * Eg, for two equivalent records A and B:
     *   A !== B                  - different objects
     *   A.equals(B) === true     - but equivalent records
     *
     *   collection.add(A)
     *   collection.get(B) === A  - returns object A, not B
     */

  }, {
    key: "get",
    value: function get(record) {
      return this.has(record) ? this._records[record.hash] : undefined;
    }
  }, {
    key: "add",
    value: function add(record) {
      if (!this.has(record)) {
        this._records[record.hash] = record;
        this.size++;
      }
    }
  }, {
    key: "addEach",
    value: function addEach(records) {
      var _this2 = this;

      records.forEach(function (record) {
        return _this2.add(record);
      });
    }
  }, {
    key: "delete",
    value: function _delete(record) {
      if (this.has(record)) {
        delete this._records[record.hash];
        this.size--;
      }
    }
  }, {
    key: "clear",
    value: function clear() {
      this._records = {};
      this.size = 0;
    }
  }, {
    key: "rebuild",
    value: function rebuild() {
      var records = this.toArray();

      this.clear();
      this.addEach(records);
    }
  }, {
    key: "toArray",
    value: function toArray() {
      return Object.values(this._records);
    }
  }, {
    key: "forEach",
    value: function forEach(fn, context) {
      this.toArray().forEach(fn.bind(context));
    }

    /**
     * @return {RecordCollection} - a new record collection
     */

  }, {
    key: "filter",
    value: function filter(fn, context) {
      return new RecordCollection(this.toArray().filter(fn.bind(context)));
    }

    /**
     * @return {RecordCollection} - a new record collection
     */

  }, {
    key: "reject",
    value: function reject(fn, context) {
      return this.filter(function (r) {
        return !fn.call(context, r);
      });
    }

    /**
     * @return {ResourceRecords[]} - array, not a new record collection
     */

  }, {
    key: "map",
    value: function map(fn, context) {
      return this.toArray().map(fn.bind(context));
    }
  }, {
    key: "reduce",
    value: function reduce(fn, acc, context) {
      return this.toArray().reduce(fn.bind(context), acc);
    }
  }, {
    key: "some",
    value: function some(fn, context) {
      return this.toArray().some(fn.bind(context));
    }
  }, {
    key: "every",
    value: function every(fn, context) {
      return this.toArray().every(fn.bind(context));
    }

    /**
     * @param  {RecordCollection|ResourceRecords[]} values - array or collection
     * @return {boolean}
     */

  }, {
    key: "equals",
    value: function equals(values) {
      var otherSet = values instanceof RecordCollection ? values : new RecordCollection(values);

      if (this.size !== otherSet.size) return false;

      return this.every(function (record) {
        return otherSet.has(record);
      });
    }

    /**
     * Returns a new RecordCollection containing the values of this collection
     * minus the records contained in the other record collection
     *
     * @param  {RecordCollection|ResourceRecords[]} values
     * @return {RecordCollection}
     */

  }, {
    key: "difference",
    value: function difference(values) {
      var otherSet = values instanceof RecordCollection ? values : new RecordCollection(values);

      return this.reject(function (record) {
        return otherSet.has(record);
      });
    }

    /**
     * Returns a new RecordCollection containing the values that exist in both
     * this collection and in the other record collection
     *
     * @param  {RecordCollection|ResourceRecords[]} values
     * @return {RecordCollection}
     */

  }, {
    key: "intersection",
    value: function intersection(values) {
      var otherSet = values instanceof RecordCollection ? values : new RecordCollection(values);

      return this.filter(function (record) {
        return otherSet.has(record);
      });
    }

    /**
     * Checks if a group of records conflicts in any way with this set.
     * Returns all records that are conflicts out of the given values.
     *
     * Records that occur in both sets are ignored when check for conflicts.
     * This is to deal with a scenario like this:
     *
     * If this set has:
     *   A 'host.local' 1.1.1.1
     *   A 'host.local' 2.2.2.2
     *
     * And incoming set look like:
     *   A 'host.local' 1.1.1.1
     *   A 'host.local' 2.2.2.2
     *   A 'host.local' 3.3.3.3  <------ extra record
     *
     * That extra record shouldn't be a conflict with 1.1.1.1 or 2.2.2.2,
     * its probably bonjour telling us that there's more addresses that
     * can be used that we're not currently using.
     *
     * @param  {RecordCollection|ResourceRecords[]} values
     * @return {ResourceRecords[]}
     */

  }, {
    key: "getConflicts",
    value: function getConflicts(values) {
      var otherSet = values instanceof RecordCollection ? values : new RecordCollection(values);

      // remove records that aren't conflicts
      var thisSet = this.difference(otherSet);
      otherSet = otherSet.difference(this);

      // find all records from the other set that conflict
      var conflicts = otherSet.filter(function (otherRecord) {
        return thisSet.some(function (thisRecord) {
          return thisRecord.conflictsWith(otherRecord);
        });
      });

      return conflicts.toArray();
    }
  }]);

  return RecordCollection;
}();

module.exports = RecordCollection;
},{}],78:[function(require,module,exports){
(function (Buffer,__filename){(function (){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var hash = require('./hash');
var misc = require('./misc');
var BufferWrapper = require('./BufferWrapper');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var RClass = require('./constants').RClass;
var RType = require('./constants').RType;
var RNums = require('./constants').RNums;

/**
 * Create/parse resource records
 * @class
 *
 * Create a specific ResourceRecord (AAAA):
 * > const record = new ResourceRecord.AAAA({name: 'Target.local.', address: '::1'});
 *
 * Parse a ResourceRecord from a buffer (a wrapped buffer):
 * > const record = ResourceRecord.fromBuffer(wrapper);
 *
 */

var ResourceRecord = function () {
  function ResourceRecord(fields) {
    _classCallCheck(this, ResourceRecord);

    if (this.constructor === ResourceRecord) throw new Error('Abstract only!');
    if (!fields || !fields.name) throw new Error('Record must have a name');

    this.name = fields.name;
    this.rrtype = fields.rrtype || RType[this.constructor.name];
    this.rrclass = fields.rrclass || RClass.IN;

    if ('ttl' in fields) this.ttl = fields.ttl;
    if ('isUnique' in fields) this.isUnique = fields.isUnique;

    this.additionals = fields.additionals || [];
  }

  /**
   * Parse a record from a buffer. Starts reading the wrapped buffer at w/e
   * position its at when fromBuffer is called.
   *
   * @param  {BufferWrapper} wrapper
   * @return {ResourceRecord}
   */


  _createClass(ResourceRecord, [{
    key: '_makehashes',


    /**
     * Makes a couple hashes of record properties so records can get compared
     * easier.
     */
    value: function _makehashes() {
      // a hash for name/rrtype/rrclass (records like PTRs might share name/type
      // but have different rdata)
      this.namehash = hash(this.name, this.rrtype, this.rrclass);
      // hash for comparing rdata
      this.rdatahash = this._hashRData();
      // a unique hash for a given name/type/class *AND* rdata
      this.hash = hash(this.namehash, this.rdatahash);
    }

    /**
     * Writes the record to a wrapped buffer at the wrapper's current position.
     * @param {BufferWrapper} wrapper
     */

  }, {
    key: 'writeTo',
    value: function writeTo(wrapper) {
      var classField = this.isUnique ? this.rrclass | 0x8000 : this.rrclass;

      // record info
      wrapper.writeFQDN(this.name);
      wrapper.writeUInt16BE(this.rrtype);
      wrapper.writeUInt16BE(classField);
      wrapper.writeUInt32BE(this.ttl);

      // leave UInt16BE gap to write rdataLen
      var rdataLenPos = wrapper.tell();
      wrapper.skip(2);

      // record specific rdata
      this._writeRData(wrapper);

      // go back and add rdata length
      var rdataLen = wrapper.tell() - rdataLenPos - 2;
      wrapper.buffer.writeUInt16BE(rdataLen, rdataLenPos);
    }

    /**
     * Checks if this record conflicts with another. Records conflict if they
     * 1) are both unique (shared record sets can't conflict)
     * 2) have the same name/type/class
     * 3) but have different rdata
     *
     * @param  {ResourceRecord} record
     * @return {boolean}
     */

  }, {
    key: 'conflictsWith',
    value: function conflictsWith(record) {
      var hasConflict = this.isUnique && record.isUnique && this.namehash === record.namehash && this.rdatahash !== record.rdatahash;

      if (hasConflict) {
        debug('Found conflict: \nRecord: %s\nIncoming: %s', this, record);
      }

      return hasConflict;
    }

    /**
     * Checks if this record can answer the question. Record names are compared
     * case insensitively.
     *
     * @param  {QueryRecord} question
     * @return {boolean}
     */

  }, {
    key: 'canAnswer',
    value: function canAnswer(question) {
      return (this.rrclass === question.qclass || question.qclass === RClass.ANY) && (this.rrtype === question.qtype || question.qtype === RType.ANY) && this.name.toUpperCase() === question.name.toUpperCase();
    }

    /**
     * Records are equal if name/type/class and rdata are the same
     */

  }, {
    key: 'equals',
    value: function equals(record) {
      return this.hash === record.hash;
    }

    /**
     * Determines which record is lexicographically later. Used to determine
     * which probe wins when two competing probes are sent at the same time.
     * (see https://tools.ietf.org/html/rfc6762#section-8.2)
     *
     * means comparing, in order,
     * - rrclass
     * - rrtype
     * - rdata, byte by byte
     *
     * Rdata has to be written to a buffer first and then compared.
     * The cache flush bit has to be excluded as well when comparing
     * rrclass.
     *
     *  1 = this record comes later than the other record
     * -1 = this record comes earlier than the other record
     *  0 = records are equal
     *
     * @param  {ResourceRecord} record
     * @return {number}
     */

  }, {
    key: 'compare',
    value: function compare(record) {
      if (this.equals(record)) return 0;

      if (this.rrclass > record.rrclass) return 1;
      if (this.rrclass < record.rrclass) return -1;

      if (this.rrtype > record.rrtype) return 1;
      if (this.rrtype < record.rrtype) return -1;

      // make buffers out of em so we can compare byte by byte
      // this also prevents data from being name compressed, since
      // we are only writing a single rdata, and nothing else
      var rdata_1 = new BufferWrapper();
      var rdata_2 = new BufferWrapper();

      this._writeRData(rdata_1);
      record._writeRData(rdata_2);

      return rdata_1.unwrap().compare(rdata_2.unwrap());
    }

    /**
     * Test if a record matches some properties. String values are compared
     * case insensitively.
     *
     * Ex:
     * > const isMatch = record.matches({name: 'test.', priority: 12})
     *
     * @param  {object} properties
     * @return {boolean}
     */

  }, {
    key: 'matches',
    value: function matches(properties) {
      var _this = this;

      return Object.keys(properties).map(function (key) {
        return [key, properties[key]];
      }).every(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            key = _ref2[0],
            value = _ref2[1];

        return typeof _this[key] === 'string' && typeof value === 'string' ? _this[key].toUpperCase() === value.toUpperCase() : misc.equals(_this[key], value);
      });
    }

    /**
     * Returns a clone of the record, making a new object
     */

  }, {
    key: 'clone',
    value: function clone() {
      var type = this.constructor.name;
      var fields = this;

      return new ResourceRecord[type](fields);
    }

    /**
     * If anything changes on a record it needs to be re-hashed. Otherwise
     * all the comparisons won't work with the new changes.
     *
     * Bad:  record.target = 'new.local.';
     * Good: record.updateWith(() => {record.target = 'new.local.'});
     *
     */

  }, {
    key: 'updateWith',
    value: function updateWith(fn) {
      // give record to updater function to modify
      fn(this);
      // rehash in case name/rdata changed
      this._makehashes();
    }

    /**
     * Records with reserved names shouldn't be goodbye'd
     *
     * _services._dns-sd._udp.<domain>.
     *         b._dns-sd._udp.<domain>.
     *        db._dns-sd._udp.<domain>.
     *         r._dns-sd._udp.<domain>.
     *        dr._dns-sd._udp.<domain>.
     *        lb._dns-sd._udp.<domain>.
     */

  }, {
    key: 'canGoodbye',
    value: function canGoodbye() {
      var name = this.name.toLowerCase();
      return name.indexOf('._dns-sd._udp.') === -1;
    }

    /**
     * Breaks up the record into an array of parts. Used in misc.alignRecords
     * so stuff can get printed nicely in columns. Only ever used in debugging.
     */

  }, {
    key: 'toParts',
    value: function toParts() {
      var parts = [];

      var type = this.constructor.name === 'Unknown' ? this.rrtype : this.constructor.name;

      var ttl = this.ttl === 0 ? misc.color(this.ttl, 'red') : String(this.ttl);

      parts.push(this.name);
      parts.push(this.ttl === 0 ? misc.color(type, 'red') : misc.color(type, 'blue'));

      parts.push(ttl);
      parts.push(String(this._getRDataStr()));

      if (this.isUnique) parts.push(misc.color('(flush)', 'grey'));

      return parts;
    }
  }, {
    key: 'toString',
    value: function toString() {
      return this.toParts().join(' ');
    }
  }], [{
    key: 'fromBuffer',
    value: function fromBuffer(wrapper) {
      var name = wrapper.readFQDN();
      var rrtype = wrapper.readUInt16BE();
      var rrclass = wrapper.readUInt16BE();
      var ttl = wrapper.readUInt32BE();

      // top-bit in rrclass is reused as the cache-flush bit
      var fields = {
        name: name,
        rrtype: rrtype,
        rrclass: rrclass & ~0x8000,
        isUnique: !!(rrclass & 0x8000),
        ttl: ttl
      };

      if (rrtype === RType.A) return new ResourceRecord.A(fields, wrapper);
      if (rrtype === RType.PTR) return new ResourceRecord.PTR(fields, wrapper);
      if (rrtype === RType.TXT) return new ResourceRecord.TXT(fields, wrapper);
      if (rrtype === RType.AAAA) return new ResourceRecord.AAAA(fields, wrapper);
      if (rrtype === RType.SRV) return new ResourceRecord.SRV(fields, wrapper);
      if (rrtype === RType.NSEC) return new ResourceRecord.NSEC(fields, wrapper);

      return new ResourceRecord.Unknown(fields, wrapper);
    }
  }]);

  return ResourceRecord;
}();

/**
 * A record (IPv4 address)
 */


var A = function (_ResourceRecord) {
  _inherits(A, _ResourceRecord);

  /**
   * @param  {object} fields
   * @param  {BufferWrapper} [wrapper] - only used by the .fromBuffer method
   */
  function A(fields, wrapper) {
    _classCallCheck(this, A);

    // defaults:
    var _this2 = _possibleConstructorReturn(this, (A.__proto__ || Object.getPrototypeOf(A)).call(this, fields));

    misc.defaults(_this2, { ttl: 120, isUnique: true });

    // rdata:
    _this2.address = fields.address || '';

    if (wrapper) _this2._readRData(wrapper);
    _this2._makehashes();
    return _this2;
  }

  _createClass(A, [{
    key: '_readRData',
    value: function _readRData(wrapper) {
      var _len = wrapper.readUInt16BE();
      var n1 = wrapper.readUInt8();
      var n2 = wrapper.readUInt8();
      var n3 = wrapper.readUInt8();
      var n4 = wrapper.readUInt8();

      this.address = n1 + '.' + n2 + '.' + n3 + '.' + n4;
    }
  }, {
    key: '_writeRData',
    value: function _writeRData(wrapper) {
      this.address.split('.').forEach(function (str) {
        var n = parseInt(str, 10);
        wrapper.writeUInt8(n);
      });
    }
  }, {
    key: '_hashRData',
    value: function _hashRData() {
      return hash(this.address);
    }
  }, {
    key: '_getRDataStr',
    value: function _getRDataStr() {
      return this.address;
    }
  }]);

  return A;
}(ResourceRecord);

ResourceRecord.A = A;

/**
 * PTR record
 */

var PTR = function (_ResourceRecord2) {
  _inherits(PTR, _ResourceRecord2);

  function PTR(fields, wrapper) {
    _classCallCheck(this, PTR);

    // defaults:
    var _this3 = _possibleConstructorReturn(this, (PTR.__proto__ || Object.getPrototypeOf(PTR)).call(this, fields));

    misc.defaults(_this3, { ttl: 4500, isUnique: false });

    // rdata:
    _this3.PTRDName = fields.PTRDName || '';

    if (wrapper) _this3._readRData(wrapper);
    _this3._makehashes();
    return _this3;
  }

  _createClass(PTR, [{
    key: '_readRData',
    value: function _readRData(wrapper) {
      var _len = wrapper.readUInt16BE();
      this.PTRDName = wrapper.readFQDN();
    }
  }, {
    key: '_writeRData',
    value: function _writeRData(wrapper) {
      wrapper.writeFQDN(this.PTRDName);
    }
  }, {
    key: '_hashRData',
    value: function _hashRData() {
      return hash(this.PTRDName);
    }
  }, {
    key: '_getRDataStr',
    value: function _getRDataStr() {
      return this.PTRDName;
    }
  }]);

  return PTR;
}(ResourceRecord);

ResourceRecord.PTR = PTR;

/**
 * TXT record
 *
 * key/value conventions:
 * - Key present with value
 *   'key=value' -> {key: value}
 *
 * - Key present, _empty_ value:
 *   'key=' -> {key: null}
 *
 * - Key present, but no value:
 *   'key' -> {key: true}
 *
 * Important note: keys are case insensitive
 */

var TXT = function (_ResourceRecord3) {
  _inherits(TXT, _ResourceRecord3);

  function TXT(fields, wrapper) {
    _classCallCheck(this, TXT);

    // defaults:
    var _this4 = _possibleConstructorReturn(this, (TXT.__proto__ || Object.getPrototypeOf(TXT)).call(this, fields));

    misc.defaults(_this4, { ttl: 4500, isUnique: true });

    // rdata:
    _this4.txtRaw = misc.makeRawTXT(fields.txt || {});
    _this4.txt = misc.makeReadableTXT(fields.txt || {});

    if (wrapper) _this4._readRData(wrapper);
    _this4._makehashes();
    return _this4;
  }

  _createClass(TXT, [{
    key: '_readRData',
    value: function _readRData(wrapper) {
      var rdataLength = wrapper.readUInt16BE();
      var end = wrapper.tell() + rdataLength;
      var len = void 0;

      // read each key: value pair
      while (wrapper.tell() < end && (len = wrapper.readUInt8())) {
        var key = '';
        var chr = void 0,
            value = void 0;

        while (len-- > 0 && (chr = wrapper.readString(1)) !== '=') {
          key += chr;
        }

        if (len > 0) value = wrapper.read(len);else if (chr === '=') value = null;else value = true;

        this.txtRaw[key] = value;
        this.txt[key] = Buffer.isBuffer(value) ? value.toString() : value;
      }
    }
  }, {
    key: '_writeRData',
    value: function _writeRData(wrapper) {
      var _this5 = this;

      // need to at least put a 0 byte if no txt data
      if (!Object.keys(this.txtRaw).length) {
        return wrapper.writeUInt8(0);
      }

      // value is either true, null, or a buffer
      Object.keys(this.txtRaw).forEach(function (key) {
        var value = _this5.txtRaw[key];
        var str = value === true ? key : key + '=';
        var len = Buffer.byteLength(str);

        if (Buffer.isBuffer(value)) len += value.length;

        wrapper.writeUInt8(len);
        wrapper.writeString(str);

        if (Buffer.isBuffer(value)) wrapper.add(value);
      });
    }
  }, {
    key: '_hashRData',
    value: function _hashRData() {
      return hash(this.txtRaw);
    }
  }, {
    key: '_getRDataStr',
    value: function _getRDataStr() {
      return misc.truncate(JSON.stringify(this.txt), 30);
    }
  }]);

  return TXT;
}(ResourceRecord);

ResourceRecord.TXT = TXT;

/**
 * AAAA record (IPv6 address)
 */

var AAAA = function (_ResourceRecord4) {
  _inherits(AAAA, _ResourceRecord4);

  function AAAA(fields, wrapper) {
    _classCallCheck(this, AAAA);

    // defaults:
    var _this6 = _possibleConstructorReturn(this, (AAAA.__proto__ || Object.getPrototypeOf(AAAA)).call(this, fields));

    misc.defaults(_this6, { ttl: 120, isUnique: true });

    // rdata:
    _this6.address = fields.address || '';

    if (wrapper) _this6._readRData(wrapper);
    _this6._makehashes();
    return _this6;
  }

  _createClass(AAAA, [{
    key: '_readRData',
    value: function _readRData(wrapper) {
      var _len = wrapper.readUInt16BE();
      var raw = wrapper.read(16);
      var parts = [];

      for (var i = 0; i < raw.length; i += 2) {
        parts.push(raw.readUInt16BE(i).toString(16));
      }

      this.address = parts.join(':').replace(/(^|:)0(:0)*:0(:|$)/, '$1::$3').replace(/:{3,4}/, '::');
    }
  }, {
    key: '_writeRData',
    value: function _writeRData(wrapper) {

      function expandIPv6(str) {
        var ip = str;

        // replace ipv4 address if any
        var ipv4_match = ip.match(/(.*:)([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$)/);

        if (ipv4_match) {
          ip = ipv4_match[1];
          var ipv4 = ipv4_match[2].match(/[0-9]+/g);

          for (var i = 0; i < 4; i++) {
            ipv4[i] = parseInt(ipv4[i], 10).toString(16);
          }

          ip += ipv4[0] + ipv4[1] + ':' + ipv4[2] + ipv4[3];
        }

        // take care of leading and trailing ::
        ip = ip.replace(/^:|:$/g, '');

        var ipv6 = ip.split(':');

        for (var _i2 = 0; _i2 < ipv6.length; _i2++) {
          // normalize grouped zeros ::
          if (ipv6[_i2] === '') {
            ipv6[_i2] = new Array(9 - ipv6.length).fill(0).join(':');
          }
        }

        return ipv6.join(':');
      }

      expandIPv6(this.address).split(':').forEach(function (str) {
        var u16 = parseInt(str, 16);
        wrapper.writeUInt16BE(u16);
      });
    }
  }, {
    key: '_hashRData',
    value: function _hashRData() {
      return hash(this.address);
    }
  }, {
    key: '_getRDataStr',
    value: function _getRDataStr() {
      return this.address;
    }
  }]);

  return AAAA;
}(ResourceRecord);

ResourceRecord.AAAA = AAAA;

/**
 * SRV record
 */

var SRV = function (_ResourceRecord5) {
  _inherits(SRV, _ResourceRecord5);

  function SRV(fields, wrapper) {
    _classCallCheck(this, SRV);

    // defaults:
    var _this7 = _possibleConstructorReturn(this, (SRV.__proto__ || Object.getPrototypeOf(SRV)).call(this, fields));

    misc.defaults(_this7, { ttl: 120, isUnique: true });

    // rdata:
    _this7.target = fields.target || '';
    _this7.port = fields.port || 0;
    _this7.priority = fields.priority || 0;
    _this7.weight = fields.weight || 0;

    if (wrapper) _this7._readRData(wrapper);
    _this7._makehashes();
    return _this7;
  }

  _createClass(SRV, [{
    key: '_readRData',
    value: function _readRData(wrapper) {
      var _len = wrapper.readUInt16BE();
      this.priority = wrapper.readUInt16BE();
      this.weight = wrapper.readUInt16BE();
      this.port = wrapper.readUInt16BE();
      this.target = wrapper.readFQDN();
    }
  }, {
    key: '_writeRData',
    value: function _writeRData(wrapper) {
      wrapper.writeUInt16BE(this.priority);
      wrapper.writeUInt16BE(this.weight);
      wrapper.writeUInt16BE(this.port);
      wrapper.writeFQDN(this.target);
    }
  }, {
    key: '_hashRData',
    value: function _hashRData() {
      return hash(this.priority, this.weight, this.port, this.target);
    }
  }, {
    key: '_getRDataStr',
    value: function _getRDataStr() {
      return this.target + ' ' + this.port + ' P:' + this.priority + ' W:' + this.weight;
    }
  }]);

  return SRV;
}(ResourceRecord);

ResourceRecord.SRV = SRV;

/**
 * NSEC record
 * Only handles the limited 'restricted' form (record rrtypes < 255)
 */

var NSEC = function (_ResourceRecord6) {
  _inherits(NSEC, _ResourceRecord6);

  function NSEC(fields, wrapper) {
    _classCallCheck(this, NSEC);

    // defaults:
    var _this8 = _possibleConstructorReturn(this, (NSEC.__proto__ || Object.getPrototypeOf(NSEC)).call(this, fields));

    misc.defaults(_this8, { ttl: 120, isUnique: true });

    // rdata:
    _this8.existing = (fields.existing || []).sort(function (a, b) {
      return a - b;
    });

    if (wrapper) _this8._readRData(wrapper);
    _this8._makehashes();
    return _this8;
  }

  _createClass(NSEC, [{
    key: '_readRData',
    value: function _readRData(wrapper) {
      var rdataLength = wrapper.readUInt16BE();
      var rdataEnd = wrapper.tell() + rdataLength;

      var _name = wrapper.readFQDN(); // doesn't matter, ignored
      var block = wrapper.readUInt8(); // window block for rrtype bitfield
      var len = wrapper.readUInt8(); // number of octets in bitfield

      // Ignore rrtypes over 255 (only implementing the restricted form)
      // Bitfield length must always be < 32, otherwise skip parsing
      if (block !== 0 || len > 32) return wrapper.seek(rdataEnd);

      // NSEC rrtype bitfields can be up to 256 bits (32 bytes), BUT
      // - js bitwise operators are only do 32 bits
      // - node's buffer.readIntBE() can only read up to 6 bytes
      //
      // So here we're doing 1 byte of the field at a time
      //
      for (var maskNum = 0; maskNum < len; maskNum++) {
        var mask = wrapper.readUInt8(1);
        if (mask === 0) continue;

        for (var bit = 0; bit < 8; bit++) {
          if (mask & 1 << bit) {
            // rrtypes in bitfields are in network bit order
            // 01000000 => 1 === RType.A (bit 6)
            // 00000000 00000000 00000000 00001000 => 28 === RType.AAAA (bit 3)
            var rrtype = 8 * maskNum + (7 - bit);
            this.existing.push(rrtype);
          }
        }
      }
    }
  }, {
    key: '_writeRData',
    value: function _writeRData(wrapper) {
      // restricted form, only rrtypes up to 255
      var rrtypes = [].concat(_toConsumableArray(new Set(this.existing))).filter(function (x) {
        return x <= 255;
      });

      // Same problems as _readRData, 32 bit operators and can't write big ints,
      // so bitfields are broken up into 1 byte segments and handled one at a time
      var len = !rrtypes.length ? 0 : Math.ceil(Math.max.apply(Math, _toConsumableArray(rrtypes)) / 8);
      var masks = Array(len).fill(0);

      rrtypes.forEach(function (rrtype) {
        var index = ~~(rrtype / 8); // which mask this rrtype is on
        var bit = 7 - rrtype % 8; // convert to network bit order

        masks[index] |= 1 << bit;
      });

      wrapper.writeFQDN(this.name); // "next domain name", ignored for mdns
      wrapper.writeUInt8(0); // block number, always 0 for restricted form
      wrapper.writeUInt8(len); // bitfield length in octets

      // write masks byte by byte since node buffers can only write 42 bit numbers
      masks.forEach(function (mask) {
        return wrapper.writeUInt8(mask);
      });
    }
  }, {
    key: '_hashRData',
    value: function _hashRData() {
      return hash(this.existing);
    }
  }, {
    key: '_getRDataStr',
    value: function _getRDataStr() {
      return this.existing.map(function (rrtype) {
        return RNums[rrtype] || rrtype;
      }).join(', ');
    }
  }]);

  return NSEC;
}(ResourceRecord);

ResourceRecord.NSEC = NSEC;

/**
 * Unknown record, anything not describe above. Could be OPT records, etc.
 */

var Unknown = function (_ResourceRecord7) {
  _inherits(Unknown, _ResourceRecord7);

  function Unknown(fields, wrapper) {
    _classCallCheck(this, Unknown);

    // defaults:
    var _this9 = _possibleConstructorReturn(this, (Unknown.__proto__ || Object.getPrototypeOf(Unknown)).call(this, fields));

    misc.defaults(_this9, { ttl: 120, isUnique: true });

    // rdata:
    _this9.rdata = fields.rdata || Buffer.alloc(0);

    if (wrapper) _this9._readRData(wrapper);
    _this9._makehashes();
    return _this9;
  }

  _createClass(Unknown, [{
    key: '_readRData',
    value: function _readRData(wrapper) {
      var rdataLength = wrapper.readUInt16BE();
      this.RData = wrapper.read(rdataLength);
    }
  }, {
    key: '_writeRData',
    value: function _writeRData(wrapper) {
      wrapper.add(this.RData);
    }
  }, {
    key: '_hashRData',
    value: function _hashRData() {
      return hash(this.RData);
    }
  }, {
    key: '_getRDataStr',
    value: function _getRDataStr() {
      // replace non-ascii characters w/ gray dots
      function ascii(chr) {
        return (/[ -~]/.test(chr) ? chr : misc.color('.', 'grey')
        );
      }

      var chars = this.RData.toString().split('');
      var str = chars.slice(0, 30).map(ascii).join('');

      return chars.length <= 30 ? str : str + '…';
    }
  }]);

  return Unknown;
}(ResourceRecord);

ResourceRecord.Unknown = Unknown;

module.exports = ResourceRecord;
}).call(this)}).call(this,require("buffer").Buffer,"/node_modules/dnssd/lib/ResourceRecord.js")
},{"./BufferWrapper":67,"./constants":85,"./debug":87,"./hash":88,"./misc":90,"buffer":5,"path":27}],79:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var misc = require('./misc');
var EventEmitter = require('./EventEmitter');
var RecordCollection = require('./RecordCollection');
var TimerContainer = require('./TimerContainer');
var StateMachine = require('./StateMachine');

var Probe = require('./Probe');
var Response = require('./Response');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var RType = require('./constants').RType;
var ONE_SECOND = 1000;

/**
 * Make ids, just to keep track of which responder is which in debug messages
 */
var counter = 0;
var uniqueId = function uniqueId() {
  return 'id#' + ++counter;
};

/**
 * Responders need to keep track of repeated conflicts to save the network. If
 * a responder has more than 15 conflicts in a small window then the responder
 * should be throttled to prevent it from spamming everyone. Conflict count
 * gets cleared after 15s w/o any conflicts
 */

var ConflictCounter = function () {
  function ConflictCounter() {
    _classCallCheck(this, ConflictCounter);

    this._count = 0;
    this._timer = null;
  }

  _createClass(ConflictCounter, [{
    key: 'count',
    value: function count() {
      return this._count;
    }
  }, {
    key: 'increment',
    value: function increment() {
      var _this = this;

      this._count++;
      clearTimeout(this._timer);

      // reset conflict counter after 15 seconds
      this._timer = setTimeout(function () {
        _this._count = 0;
      }, 15 * ONE_SECOND);

      // prevent timer from holding the process
      this._timer.unref();
    }
  }, {
    key: 'clear',
    value: function clear() {
      this._count = 0;
      clearTimeout(this._timer);
    }
  }]);

  return ConflictCounter;
}();

/**
 * Responder
 * @class
 *
 * A responder object takes a record set and:
 * - probes to see if anyone else on the network is using that name
 * - responds to queries (and other probes) about the record set
 * - renames the records whenever there is a conflict (from probes/answers)
 * - sends goodbye messages when stopped
 *
 * A record set will be something like A/AAAA address records for interfaces or
 * PTR/SRV/TXT records for a service. Each set will only have one unique name.
 *
 * Responders keeps record set names in sync across any number of interfaces,
 * so if the set has a conflict on any one interface it will cause it to be
 * renamed on all interfaces.
 *
 * Functions as a state machine with these main states:
 * probing -> conflict (rename) -> responding -> goodbying -> stopped (final)
 *
 * Listens to interface probe, answer, and query events. Any errors from
 * interfaces are bad and stops to whole thing.
 *
 * @emits 'probingComplete' when probing has completed successfully
 * @emits 'rename' w/ new name whenever a conflict forces a rename
 * @emits 'error'
 */

var responderStates = {
  probing: {
    enter: function enter() {
      var _this2 = this;

      debug('Now probing for: ' + this._fullname);

      var onSuccess = function onSuccess(early) {
        _this2.transition('responding', early);
      };
      var onFail = function onFail() {
        _this2.transition('conflict');
      };

      // If the probing process takes longer than 1 minute something is wrong
      // and it should abort. This gets cleared when entering responding state
      if (!this._timers.has('timeout')) {
        this._timers.set('timeout', function () {
          _this2.transition('stopped', new Error('Could not probe within 1 min'));
        }, 60 * ONE_SECOND);
      }

      // If there are too many sequential conflicts, take a break before probing
      if (this._conflicts.count() >= 15) {
        debug('Too many conflicts, slowing probe down. (' + this._id + ')');

        this._timers.set('delayed-probe', function () {
          _this2._sendProbe(onSuccess, onFail);
        }, 5 * ONE_SECOND);

        return;
      }

      this._sendProbe(onSuccess, onFail);
    },


    // If records get updated mid-probe we need to restart the probing process
    update: function update() {
      this.states.probing.exit.call(this);
      this.states.probing.enter.call(this);
    },


    // Stop any active probes, not needed anymore
    // Stop probes that were being throttled due to repeated conflicts
    exit: function exit() {
      this._stopActives();
      this._timers.clear('delayed-probe');
    }
  },

  responding: {
    enter: function enter(skipAnnounce) {
      debug('Done probing, now responding for "' + this._fullname + '" (' + this._id + ')');

      // clear probing timeout since probing was successful
      this._timers.clear('timeout');

      // announce verified records to the network (or not)
      if (!skipAnnounce) this._sendAnnouncement(3);else debug('Skipping announcement. (' + this._id + ')');

      // emit last
      this.emit('probingComplete');
    },


    // Only listen to these interface events in the responding state:
    probe: function probe(packet) {
      this._onProbe(packet);
    },
    query: function query(packet) {
      this._onQuery(packet);
    },
    answer: function answer(packet) {
      this._onAnswer(packet);
    },


    // stop any active announcements / responses before announcing changes
    update: function update() {
      this._stopActives();
      this._sendAnnouncement();
    },


    // stop any active announcements / responses before changing state
    exit: function exit() {
      this._stopActives();
    }
  },

  // Records get renamed on conflict, nothing else happens, no events fire.
  // Mostly is its own state for the convenience of having other exit &
  // enter handlers called.
  conflict: {
    enter: function enter() {
      debug('Had a conflict with "' + this._instance + '", renaming. (' + this._id + ')');

      // Instance -> Instance (2)
      var oldName = this._instance;
      var newName = this._rename(oldName);

      // Instance._http._tcp.local. -> Instance (2)._http._tcp.local.
      var oldFull = this._fullname;
      var newFull = this._fullname.replace(oldName, newName);

      this._instance = newName;
      this._fullname = newFull;

      // apply rename to records (using updateWith() so records get rehashed)
      // (note, has to change PTR fields too)
      function rename(record) {
        record.updateWith(function () {
          if (record.name === oldFull) record.name = newFull;
          if (record.PTRDName === oldFull) record.PTRDName = newFull;
        });
      }

      this._records.forEach(rename);
      this._bridgeable.forEach(rename);

      // rebuild bridge set since renames alters record hashes
      this._bridgeable.rebuild();

      this._conflicts.increment();
      this.transition('probing');

      // emits the new (not yet verified) name
      this.emit('rename', newName);
    }
  },

  // Sends TTL=0 goodbyes for all records. Uses a callback that fires once all
  // goodbyes have been sent. Transitions to stopped when done.
  goodbying: {
    enter: function enter(callback) {
      var _this3 = this;

      var finish = function finish() {
        _this3.transition('stopped');
        callback();
      };

      // Only send goodbyes if records were valid/probed, otherwise just stop
      if (this.prevState !== 'responding') finish();else this._sendGoodbye(finish);
    },
    exit: function exit() {
      this._stopActives();
    }
  },

  // Terminal state. Cleans up any existing timers and stops listening to
  // interfaces. Emits any errors, like from probing timeouts.
  stopped: {
    enter: function enter(err) {
      debug('Responder stopping (' + this._id + ')');

      this._timers.clear();
      this._conflicts.clear();
      this._stopActives();
      this._removeListeners();

      if (err) this.emit('error', err);

      // override this.transition, because responder is stopped now
      // (shouldn't ever be a problem anyway, mostly for debugging)
      this.transition = function () {
        return debug("Responder is stopped! Can't transition.");
      };
    }
  }
};

/**
 * @constructor
 *
 * Records is an array of all records, some may be on one interface, some may
 * be on another interface. (Each record has an .interfaceID field that
 * indicates what interface it should be used on. We need this because some
 * record, like A/AAAA which have different rdata (addresses) for each
 * interface they get used on.) So the records param might look like this:
 * [
 *   'Target.local.' A    192.168.1.10 ethernet,  <-- different rdata
 *   'Target.local.' AAAA FF::CC::1    ethernet,
 *   'Target.local.' NSEC A, AAAA      ethernet,
 *   'Target.local.' A    192.168.1.25 wifi,      <-- different rdata
 *   'Target.local.' AAAA AA::BB::7    wifi,
 *   'Target.local.' NSEC A, AAAA      wifi,      <-- same as ethernet ok
 * ]
 *
 * @param  {NetworkInterfaces} interface
 * @param  {ResourceRecords[]} records
 * @param  {ResourceRecords[]} bridgeable
 */

var Responder = function (_StateMachine) {
  _inherits(Responder, _StateMachine);

  function Responder(intf, records, bridgeable) {
    _classCallCheck(this, Responder);

    var _this4 = _possibleConstructorReturn(this, (Responder.__proto__ || Object.getPrototypeOf(Responder)).call(this, responderStates));

    _this4._id = uniqueId();
    debug('Creating new responder (%s) using: %r', _this4._id, records);

    var uniques = [].concat(_toConsumableArray(new Set(records.filter(function (r) {
      return r.isUnique;
    }).map(function (r) {
      return r.name;
    }))));

    if (!uniques.length) throw Error('No unique names in record set');
    if (uniques.length > 1) throw Error('Too many unique names in record set');

    _this4._interface = intf;
    _this4._records = records;
    _this4._bridgeable = new RecordCollection(bridgeable);

    // the unique name that this record set revolves around
    // eg: "Instance._http._tcp.local."
    _this4._fullname = uniques[0];

    // the part of the name that needs to be renamed on conflicts
    // eg: "Instance"
    _this4._instance = misc.parse(_this4._fullname).instance;
    if (!_this4._instance) throw Error('No instance name found in records');

    _this4._timers = new TimerContainer(_this4);
    _this4._conflicts = new ConflictCounter();

    // emitter used to stop child probes & responses without having to hold
    // onto a reference for each one
    _this4._offswitch = new EventEmitter();
    return _this4;
  }

  _createClass(Responder, [{
    key: 'start',
    value: function start() {
      debug('Starting responder (' + this._id + ')');
      this._addListeners();
      this.transition('probing');
    }

    // Immediately stops the responder (no goodbyes)

  }, {
    key: 'stop',
    value: function stop() {
      debug('Stopping responder (' + this._id + ')');
      this.transition('stopped');
    }

    // Sends goodbyes before stopping

  }, {
    key: 'goodbye',
    value: function goodbye(onComplete) {
      if (this.state === 'stopped') {
        debug('Responder already stopped!');
        return onComplete();
      }

      debug('Goodbying on responder (' + this._id + ')');
      this.transition('goodbying', onComplete);
    }

    /**
     * Updates all records that match the rrtype.
     *
      // updates should only consist of updated rdata, no name changes
      // (which means no shared records will be changed, and no goodbyes)
      * @param {integer}  rrtype - rrtype to be updated
     * @param {function} fn     - function to call that does the updating
     */

  }, {
    key: 'updateEach',
    value: function updateEach(rrtype, fn) {
      debug('Updating rtype ' + rrtype + ' records. (' + this._id + ')');

      // modify properties of each record with given update fn
      this._records.filter(function (record) {
        return record.rrtype === rrtype;
      }).forEach(function (record) {
        return record.updateWith(fn);
      });

      // (update bridge list too)
      this._bridgeable.filter(function (record) {
        return record.rrtype === rrtype;
      }).forEach(function (record) {
        return record.updateWith(fn);
      });

      // rebuild bridge set since updates may have altered record hashes
      this._bridgeable.rebuild();

      // may need to announce changes or re-probe depending on current state
      this.handle('update');
    }

    /**
     * Get all records being used on an interface
     * (important because records could change with renaming)
     * @return {ResourceRecords[]}
     */

  }, {
    key: 'getRecords',
    value: function getRecords() {
      return this._records;
    }
  }, {
    key: '_addListeners',
    value: function _addListeners() {
      var _this5 = this;

      this._interface.using(this).on('probe', function (packet) {
        return _this5.handle('probe', packet);
      }).on('query', function (packet) {
        return _this5.handle('query', packet);
      }).on('answer', function (packet) {
        return _this5.handle('answer', packet);
      }).once('error', function (err) {
        return _this5.transition('stopped', err);
      });
    }
  }, {
    key: '_removeListeners',
    value: function _removeListeners() {
      this._interface.removeListenersCreatedBy(this);
    }

    /**
     * Stop any active probes, announcements, or goodbyes (all outgoing stuff uses
     * the same offswitch)
     */

  }, {
    key: '_stopActives',
    value: function _stopActives() {
      debug('Sending stop signal to actives. (' + this._id + ')');
      this._offswitch.emit('stop');
    }

    /**
     * Probes records on each interface, call onSuccess when all probes have
     * completed successfully or calls onFail as soon as one probes fails. Probes
     * may finish early in some situations. If they do, onSuccess is called with
     * `true` to indicate that.
     */

  }, {
    key: '_sendProbe',
    value: function _sendProbe(onSuccess, onFail) {
      var _this6 = this;

      debug('Sending probes for "' + this._fullname + '". (' + this._id + ')');
      if (this.state === 'stopped') return debug('... already stopped!');

      // only unique records need to be probed
      var records = this._records.filter(function (record) {
        return record.isUnique;
      });

      // finish early if exact copies are found in the cache
      if (records.every(function (record) {
        return _this6._interface.cache.has(record);
      })) {
        debug('All records found in cache, skipping probe...');
        return onSuccess(true);
      }

      // skip network trip if any conflicting records are found in cache
      if (records.some(function (record) {
        return _this6._interface.cache.hasConflictWith(record);
      })) {
        debug('Conflict found in cache, renaming...');
        return onFail();
      }

      new Probe(this._interface, this._offswitch).add(records).bridgeable(this._bridgeable).once('conflict', onFail).once('complete', onSuccess).start();
    }

    /**
     * Send unsolicited announcements out when
     * - done probing
     * - changing rdata on a verified records (like TXTs)
     * - defensively correcting issues (TTL=0's, bridged records)
     */

  }, {
    key: '_sendAnnouncement',
    value: function _sendAnnouncement() {
      var num = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

      debug('Sending ' + num + ' announcements for "' + this._fullname + '". (' + this._id + ')');
      if (this.state === 'stopped') return debug('... already stopped!');

      new Response.Multicast(this._interface, this._offswitch).add(this._records).repeat(num).start();
    }
  }, {
    key: '_sendGoodbye',
    value: function _sendGoodbye(onComplete) {
      debug('Sending goodbyes for "' + this._fullname + '". (' + this._id + ')');
      if (this.state === 'stopped') return debug('... already stopped!');

      // skip goodbyes for special record types, like the enumerator PTR
      var records = this._records.filter(function (record) {
        return record.canGoodbye();
      });

      new Response.Goodbye(this._interface, this._offswitch).add(records).once('stopped', onComplete).start();
    }

    /**
     * "Instance" -> "Instance (2)"
     * "Instance (2)" -> "Instance (3)", etc.
     */

  }, {
    key: '_rename',
    value: function _rename(label) {
      var re = /\((\d+)\)$/; // match ' (#)'

      function nextSuffix(match, n) {
        var next = parseInt(n, 10) + 1;
        return '(' + next + ')';
      }

      return re.test(label) ? label.replace(re, nextSuffix) : label + ' (2)';
    }

    /**
     * Handles incoming probes from an interface. Only ever gets used in the
     * `responding` state. Sends out multicast and/or unicast responses if any of
     * the probe records conflict with what this responder is currently using.
     */

  }, {
    key: '_onProbe',
    value: function _onProbe(packet) {
      var intf = this._interface;
      var name = this._fullname;
      var records = this._records;

      var multicast = [];
      var unicast = [];

      packet.questions.forEach(function (question) {
        // check if negative responses are needed for this question, ie responder
        // controls the name but doesn't have rrtype XYZ record. send NSEC instead.
        var shouldAnswer = question.name.toUpperCase() === name.toUpperCase();
        var answered = false;

        records.forEach(function (record) {
          if (!record.canAnswer(question)) return;

          // send as unicast if requested BUT only if the interface has not
          // multicast this record recently (withing 1/4 of the record's TTL)
          if (question.QU && intf.hasRecentlySent(record, record.ttl / 4)) {
            unicast.push(record);
            answered = true;
          } else {
            multicast.push(record);
            answered = true;
          }
        });

        if (shouldAnswer && !answered) {
          multicast.push(records.find(function (r) {
            return r.rrtype === RType.NSEC && r.name === name;
          }));
        }
      });

      if (multicast.length) {
        debug('Defending name with a multicast response. (' + this._id + ')');

        new Response.Multicast(intf, this._offswitch).defensive(true).add(multicast).start();
      }

      if (unicast.length) {
        debug('Defending name with a unicast response. (' + this._id + ')');

        new Response.Unicast(intf, this._offswitch).respondTo(packet).defensive(true).add(unicast).start();
      }
    }

    /**
     * Handles incoming queries from an interface. Only ever gets used in the
     * `responding` state. Sends out multicast and/or unicast responses if any of
     * the responders records match the questions.
     */

  }, {
    key: '_onQuery',
    value: function _onQuery(packet) {
      var intf = this._interface;
      var name = this._fullname;
      var records = this._records;
      var knownAnswers = new RecordCollection(packet.answers);

      var multicast = [];
      var unicast = [];
      var suppressed = [];

      packet.questions.forEach(function (question) {
        // Check if negative responses are needed for this question, ie responder
        // controls the name but doesn't have rrtype XYZ record. send NSEC instead.
        var shouldAnswer = question.name.toUpperCase() === name.toUpperCase();
        var answered = false;

        records.forEach(function (record) {
          if (!record.canAnswer(question)) return;
          var knownAnswer = knownAnswers.get(record);

          // suppress known answers if the answer's TTL is still above 50%
          if (knownAnswer && knownAnswer.ttl > record.ttl / 2) {
            suppressed.push(record);
            answered = true;

            // always respond via unicast to legacy queries (not from port 5353)
          } else if (packet.isLegacy()) {
            unicast.push(record);
            answered = true;

            // send as unicast if requested BUT only if the interface has not
            // multicast this record recently (withing 1/4 of the record's TTL)
          } else if (question.QU && intf.hasRecentlySent(record, record.ttl / 4)) {
            unicast.push(record);
            answered = true;

            // otherwise send a multicast response
          } else {
            multicast.push(record);
            answered = true;
          }
        });

        if (shouldAnswer && !answered) {
          multicast.push(records.find(function (r) {
            return r.rrtype === RType.NSEC && r.name === name;
          }));
        }
      });

      if (suppressed.length) {
        debug('Suppressing known answers (%s): %r', this._id, suppressed);
      }

      if (multicast.length) {
        debug('Answering question with a multicast response. (' + this._id + ')');

        new Response.Multicast(intf, this._offswitch).add(multicast).start();
      }

      if (unicast.length) {
        debug('Answering question with a unicast response. (' + this._id + ')');

        new Response.Unicast(intf, this._offswitch).respondTo(packet).add(unicast).start();
      }
    }

    /**
     * Handles incoming answer packets from an interface. Only ever gets used in
     * the `responding` state, meaning it will also have to handle packets that
     * originated from the responder itself as they get looped back through the
     * interfaces.
     *
     * The handler watches for:
     * - Conflicting answers, which would force the responder to re-probe
     * - Bad goodbyes that need to be fixed / re-announced
     * - Bridged packets that make the responder re-announce
     *
     * Bridged packets need special attention here because they cause problems.
     * (See: https://tools.ietf.org/html/rfc6762#section-14)
     *
     * Scenario: both wifi and ethernet are connected on a machine. This responder
     * uses A/AAAA records for each interface, but they have different addresses.
     * Because the interfaces are bridged, wifi packets get heard on ethernet and
     * vice versa. The responder would normally freak out because the wifi A/AAAA
     * records conflict with the ethernet A/AAAA records, causing a never ending
     * spiral of conflicts/probes/death. The solution is to check if records got
     * bridged before freaking out. The second problem is that the wifi records
     * will then clobber anything on the ethernet, flushing the ethernet records
     * from their caches (flush records get deleted in 1s, remember). To correct
     * this, when we detect our packets getting bridged back to us we need to
     * re-announce our records. This will restore the records in everyone's caches
     * and prevent them from getting deleted (that 1s thing). In response to the
     * re-announced (and bridged) ethernet records, the responder will try to
     * re-announce the wifi records, but this cycle will be stopped because
     * records are limited to being sent once ever 1 second. Its kind of a mess.
     *
     * Note, we don't need to worry about handling our own goodbye records
     * because there is no _onAnswer handler in the `goodbying` state.
     */

  }, {
    key: '_onAnswer',
    value: function _onAnswer(packet) {
      var records = new RecordCollection(this._records);
      var incoming = new RecordCollection([].concat(_toConsumableArray(packet.answers), _toConsumableArray(packet.additionals)));

      // Defensively re-announce records getting TTL=0'd by other responders.
      var shouldFix = incoming.filter(function (record) {
        return record.ttl === 0;
      }).hasAny(records);

      if (shouldFix) {
        debug('Fixing goodbyes, re-announcing records. (' + this._id + ')');
        return this._sendAnnouncement();
      }

      var conflicts = records.getConflicts(incoming);

      if (conflicts.length) {
        // if the conflicts are just due to a bridged packet, re-announce instead
        if (this._bridgeable.hasEach(conflicts)) {
          debug('Bridged packet detected, re-announcing records. (' + this._id + ')');
          return this._sendAnnouncement();
        }

        // re-probe needed to verify uniqueness (doesn't rename until probing fails)
        debug('Found conflict on incoming records, re-probing. (' + this._id + ')');
        return this.transition('probing');
      }
    }
  }]);

  return Responder;
}(StateMachine);

module.exports = Responder;
}).call(this)}).call(this,"/node_modules/dnssd/lib/Responder.js")
},{"./EventEmitter":69,"./Probe":74,"./RecordCollection":77,"./Response":80,"./StateMachine":83,"./TimerContainer":84,"./constants":85,"./debug":87,"./misc":90,"path":27}],80:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Packet = require('./Packet');
var EventEmitter = require('./EventEmitter');
var RecordCollection = require('./RecordCollection');
var TimerContainer = require('./TimerContainer');
var sleep = require('./sleep');
var misc = require('./misc');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var RType = require('./constants').RType;
var ONE_SECOND = 1000;

var counter = 0;
var uniqueId = function uniqueId() {
  return 'id#' + ++counter;
};

/**
 * Creates a new MulticastResponse
 * @class
 * @extends EventEmitter
 *
 * Sends out a multicast response of records on a given interface. Responses
 * can be set to repeat multiple times.
 *
 * @emits 'stopped'
 *
 * @param {NetworkInterface} intf - the interface the response will work on
 * @param {EventEmitter}     offswitch - emitter used to shut this response down
 */
function MulticastResponse(intf, offswitch) {
  EventEmitter.call(this);

  // id only used for figuring out logs
  this._id = uniqueId();
  debug('Creating new response (' + this._id + ')');

  this._intf = intf;
  this._offswitch = offswitch;
  this._answers = new RecordCollection();
  this._isStopped = false;

  // defaults
  this._repeats = 1;
  this._delay = 0;
  this._isDefensive = false;

  // repeat responses, first at 1s apart, then increasing by a factor of 2
  this._next = ONE_SECOND;
  this._timers = new TimerContainer(this);

  // listen to answers on interface to suppress duplicate answers
  // stop on either the offswitch of an interface error
  intf.using(this).on('answer', this._onAnswer).once('error', this.stop);

  // waking from sleep should cause the response to stop too
  sleep.using(this).on('wake', this.stop);
  offswitch.using(this).once('stop', this.stop);
}

MulticastResponse.prototype = Object.create(EventEmitter.prototype);
MulticastResponse.prototype.constructor = MulticastResponse;

/**
 * Adds records to be sent out.
 * @param {ResourceRecords|ResourceRecords[]} arg
 */
MulticastResponse.prototype.add = function (arg) {
  var records = Array.isArray(arg) ? arg : [arg];

  // In any case where there may be multiple responses, like when all outgoing
  // records are non-unique (like PTRs) response should be delayed 20-120 ms.
  this._delay = records.some(function (record) {
    return !record.isUnique;
  }) ? misc.random(20, 120) : 0;
  this._answers.addEach(records);

  return this;
};

MulticastResponse.prototype.repeat = function (num) {
  this._repeats = num;
  return this;
};

/**
 * Some responses are 'defensive' in that they are responding to probes or
 * correcting some problem like an erroneous TTL=0.
 */
MulticastResponse.prototype.defensive = function (bool) {
  this._isDefensive = !!bool;
  return this;
};

/**
 * Starts sending out records.
 */
MulticastResponse.prototype.start = function () {
  // remove delay for defensive responses
  var delay = this._isDefensive ? 0 : this._delay;

  // prepare next outgoing packet in advance while listening to other answers
  // on the interface so duplicate answers in this packet can be suppressed.
  this._queuedPacket = this._makePacket();
  this._timers.setLazy('next-response', this._send, delay);

  return this;
};

/**
 * Stops the response & cleans up after itself.
 * @emits 'stopped' event when done
 */
MulticastResponse.prototype.stop = function () {
  if (this._isStopped) return;

  debug('Response stopped (' + this._id + ')');
  this._isStopped = true;

  this._timers.clear();

  this._intf.removeListenersCreatedBy(this);
  this._offswitch.removeListenersCreatedBy(this);
  sleep.removeListenersCreatedBy(this);

  this.emit('stopped');
};

/**
 * Sends the response packets.
 *
 * socket.send() has a callback to know when the response was actually sent.
 * Responses shut down after repeats run out.
 */
MulticastResponse.prototype._send = function () {
  var _this = this;

  this._repeats--;
  debug('Sending response, ' + this._repeats + ' repeats left (' + this._id + ')');

  var packet = this._suppressRecents(this._queuedPacket);

  // send packet, stop when all responses have been sent
  this._intf.send(packet, null, function () {
    if (_this._repeats <= 0) _this.stop();
  });

  // reschedule the next response if needed. the packet is prepared in advance
  // so incoming responses can be checked for duplicate answers.
  if (this._repeats > 0) {
    this._queuedPacket = this._makePacket();
    this._timers.setLazy('next-response', this._send, this._next);

    // each successive response increases delay by a factor of 2
    this._next *= 2;
  }
};

/**
 * Create a response packet.
 * @return {Packet}
 */
MulticastResponse.prototype._makePacket = function () {
  var packet = new Packet();
  var additionals = new RecordCollection();

  this._answers.forEach(function (answer) {
    additionals.addEach(answer.additionals);
  });

  packet.setResponseBit();
  packet.setAnswers(this._answers.toArray());
  packet.setAdditionals(additionals.difference(this._answers).toArray());

  return packet;
};

/**
 * Removes recently sent records from the outgoing packet
 *
 * Check the interface to for each outbound record. Records are limited to
 * being sent to the multicast address once every 1s except for probe responses
 * (and other defensive responses) that can be sent every 250ms.
 *
 * @param  {Packet} packet - the outgoing packet
 * @return {Packet}
 */
MulticastResponse.prototype._suppressRecents = function (packet) {
  var _this2 = this;

  var range = this._isDefensive ? 0.25 : 1.0;

  var answers = packet.answers.filter(function (record) {
    return !_this2._intf.hasRecentlySent(record, range);
  });

  var suppressed = packet.answers.filter(function (a) {
    return !~answers.indexOf(a);
  });

  if (suppressed.length) {
    debug('Suppressing recently sent (%s): %r', this._id, suppressed);
    packet.setAnswers(answers);
  }

  return packet;
};

/**
 * Handles incoming answer (response) packets
 *
 * This is solely used to do duplicate answer suppression (7.4). If another
 * responder has sent the same answer as one this response is about to send,
 * this response can suppress that answer since someone else already sent it.
 * Modifies the next scheduled response packet only (this._queuedPacket).
 *
 * Note: this handle will receive this response's packets too
 *
 * @param {Packet} packet - the incoming probe packet
 */
MulticastResponse.prototype._onAnswer = function (packet) {
  if (this._isStopped) return;

  // prevent this response from accidentally suppressing itself
  // (ignore packets that came from this interface)
  if (packet.isLocal()) return;

  // ignore goodbyes in suppression check
  var incoming = packet.answers.filter(function (answer) {
    return answer.ttl !== 0;
  });
  var outgoing = this._queuedPacket.answers;

  // suppress outgoing answers that also appear in incoming records
  var answers = new RecordCollection(outgoing).difference(incoming).toArray();
  var suppressed = outgoing.filter(function (out) {
    return !~answers.indexOf(out);
  });

  if (suppressed.length) {
    debug('Suppressing duplicate answers (%s): %r', this._id, suppressed);
    this._queuedPacket.setAnswers(answers);
  }
};

/**
 * Creates a new GoodbyeResponse
 * @class
 * @extends MulticastResponse
 *
 * Sends out a multicast response of records that are now dead on an interface.
 * Goodbyes can be set to repeat multiple times.
 *
 * @emits 'stopped'
 *
 * @param {NetworkInterface} intf - the interface the response will work on
 * @param {EventEmitter}     offswitch - emitter used to shut this response down
 */
function GoodbyeResponse(intf, offswitch) {
  MulticastResponse.call(this, intf, offswitch);
  debug('└─ a goodbye response');
}

GoodbyeResponse.prototype = Object.create(MulticastResponse.prototype);
GoodbyeResponse.constructor = GoodbyeResponse;

/**
 * Makes a goodbye packet
 * @return {Packet}
 */
GoodbyeResponse.prototype._makePacket = function () {
  var packet = new Packet();

  // Records getting goodbye'd need a TTL=0
  // Clones are used so original records (held elsewhere) don't get mutated
  var answers = this._answers.map(function (record) {
    var clone = record.clone();
    clone.ttl = 0;
    return clone;
  });

  packet.setResponseBit();
  packet.setAnswers(answers);

  return packet;
};

// Don't suppress recents on goodbyes, return provided packet unchanged
GoodbyeResponse.prototype._suppressRecents = function (p) {
  return p;
};

// Don't do answer suppression on goodbyes
GoodbyeResponse.prototype._onAnswer = function () {};

/**
 * Creates a new UnicastResponse
 * @class
 * @extends EventEmitter
 *
 * Sends out a unicast response to a destination. There are two types of
 * unicast responses here:
 *   - direct responses to QU questions (mDNS rules)
 *   - legacy responses (normal DNS packet rules)
 *
 * @emits 'stopped'
 *
 * @param {NetworkInterface} intf - the interface the response will work on
 * @param {EventEmitter}     offswitch - emitter used to shut this response down
 */
function UnicastResponse(intf, offswitch) {
  EventEmitter.call(this);

  // id only used for figuring out logs
  this._id = uniqueId();
  debug('Creating a new unicast response (' + this._id + ')');

  this._intf = intf;
  this._offswitch = offswitch;
  this._answers = new RecordCollection();
  this._timers = new TimerContainer(this);

  // defaults
  this._delay = 0;
  this._isDefensive = false;

  // unicast & legacy specific
  this._destination = {};
  this._isLegacy = false;
  this._headerID = null;
  this._questions = null;

  // stops on offswitch event or interface errors
  intf.using(this).once('error', this.stop);
  offswitch.using(this).once('stop', this.stop);
  sleep.using(this).on('wake', this.stop);
}

UnicastResponse.prototype = Object.create(EventEmitter.prototype);
UnicastResponse.prototype.constructor = UnicastResponse;

/**
 * Adds records to be sent out.
 * @param {ResourceRecords|ResourceRecords[]} arg
 */
UnicastResponse.prototype.add = function (arg) {
  var records = Array.isArray(arg) ? arg : [arg];

  // In any case where there may be multiple responses, like when all outgoing
  // records are non-unique (like PTRs) response should be delayed 20-120 ms.
  this._delay = records.some(function (record) {
    return !record.isUnique;
  }) ? misc.random(20, 120) : 0;
  this._answers.addEach(records);

  return this;
};

UnicastResponse.prototype.defensive = function (bool) {
  this._isDefensive = !!bool;
  return this;
};

/**
 * Sets destination info based on the query packet this response is addressing.
 * Legacy responses will have to keep the questions and the packet ID for later.
 *
 * @param {Packet} packet - query packet to respond to
 */
UnicastResponse.prototype.respondTo = function (packet) {
  this._destination.port = packet.origin.port;
  this._destination.address = packet.origin.address;

  if (packet.isLegacy()) {
    debug('preparing legacy response (' + this._id + ')');

    this._isLegacy = true;
    this._headerID = packet.header.ID;
    this._questions = packet.questions;

    this._questions.forEach(function (question) {
      question.QU = false;
    });
  }

  return this;
};

/**
 * Sends response packet to destination. Stops when packet has been sent.
 * No delay for defensive or legacy responses.
 */
UnicastResponse.prototype.start = function () {
  var _this3 = this;

  var packet = this._makePacket();
  var delay = this._isDefensive || this._isLegacy ? 0 : this._delay;

  this._timers.setLazy(function () {
    debug('Sending unicast response (' + _this3._id + ')');

    _this3._intf.send(packet, _this3._destination, function () {
      return _this3.stop();
    });
  }, delay);

  return this;
};

/**
 * Stops response and cleans up.
 * @emits 'stopped' event when done
 */
UnicastResponse.prototype.stop = function () {
  if (this._isStopped) return;

  debug('Unicast response stopped (' + this._id + ')');
  this._isStopped = true;

  this._timers.clear();

  this._intf.removeListenersCreatedBy(this);
  this._offswitch.removeListenersCreatedBy(this);
  sleep.removeListenersCreatedBy(this);

  this.emit('stopped');
};

/**
 * Makes response packet. Legacy response packets need special treatment.
 * @return {Packet}
 */
UnicastResponse.prototype._makePacket = function () {
  var packet = new Packet();

  var answers = this._answers.toArray();
  var additionals = answers.reduce(function (result, answer) {
    return result.concat(answer.additionals);
  }, []).filter(function (add) {
    return !~answers.indexOf(add);
  });

  additionals = [].concat(_toConsumableArray(new Set(additionals)));

  // Set TTL=10 on records for legacy responses. Use clones to prevent
  // altering the original record set.
  function legacyify(record) {
    var clone = record.clone();
    clone.isUnique = false;
    clone.ttl = 10;
    return clone;
  }

  if (this._isLegacy) {
    packet.header.ID = this._headerID;
    packet.setQuestions(this._questions);

    answers = answers.filter(function (record) {
      return record.rrtype !== RType.NSEC;
    }).map(legacyify);

    additionals = additionals.filter(function (record) {
      return record.rrtype !== RType.NSEC;
    }).map(legacyify);
  }

  packet.setResponseBit();
  packet.setAnswers(answers);
  packet.setAdditionals(additionals);

  return packet;
};

module.exports = {
  Multicast: MulticastResponse,
  Goodbye: GoodbyeResponse,
  Unicast: UnicastResponse
};
}).call(this)}).call(this,"/node_modules/dnssd/lib/Response.js")
},{"./EventEmitter":69,"./Packet":73,"./RecordCollection":77,"./TimerContainer":84,"./constants":85,"./debug":87,"./misc":90,"./sleep":92,"path":27}],81:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var misc = require('./misc');
var EventEmitter = require('./EventEmitter');
var QueryRecord = require('./QueryRecord');

var Query = require('./Query');
var TimerContainer = require('./TimerContainer');
var StateMachine = require('./StateMachine');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var RType = require('./constants').RType;

/**
 * Service Resolver
 *
 * In order to actually use a service discovered on the network, you need to
 * know the address of the service, the port its on, and any TXT data.
 * ServiceResponder takes a description of a service and any initial known
 * records and tries to find the missing pieces.
 *
 * ServiceResolver is a state machine with 3 states: unresolved, resolved, and
 * stopped. The resolver will stay active as long as knowledge about the
 * service is needed. The resolve will check for updates as service records go
 * stale and will notify if records expire and the service goes down.
 *
 */
var resovlverStates = {
  unresolved: {
    enter: function enter() {
      var _this = this;

      debug('Service is unresolved');

      // Give resolver 10s to query and resolve. If it can't find
      // all the records it needs in 10s then something is probably wrong
      this._timers.set('timeout', function () {
        debug('Resolver timed out.');
        _this.transition('stopped');
      }, 10 * 1000);

      this._queryForMissing();
    },
    incomingRecords: function incomingRecords(records) {
      var wasUpdated = this._processRecords(records);

      if (this.isResolved()) this.transition('resolved');else if (wasUpdated) this._queryForMissing();
    },
    reissue: function reissue(record) {
      this._batchReissue(record);
    },
    exit: function exit() {
      this._cancelQueries();
      this._timers.clear('timeout');
    }
  },

  resolved: {
    enter: function enter() {
      debug('Service is resolved');
      this.emit('resolved');
    },
    incomingRecords: function incomingRecords(records) {
      var wasUpdated = this._processRecords(records);

      if (!this.isResolved()) this.transition('unresolved');else if (wasUpdated) this.emit('updated');
    },
    reissue: function reissue(record) {
      this._batchReissue(record);
    },
    exit: function exit() {
      this._cancelQueries();
    }
  },

  stopped: {
    enter: function enter() {
      debug('Stopping resolver "' + this.fullname + '"');

      this._cancelQueries();
      this._removeListeners();

      this.emit('down');

      // override this.transition, because resolver is down now
      // (shouldn't be a problem anyway, more for debugging)
      this.transition = function () {
        return debug("Service is down! Can't transition.");
      };
    }
  }
};

/**
 * Creates a new ServiceResolver
 * @class
 *
 * Fullname is the string describing the service to resolve, like:
 * 'Instance (2)._http._tcp.local.'
 *
 * @emits 'resovled'
 * @emits 'updated'
 * @emits 'down'
 *
 * @param  {string} fullname
 * @param  {Networkinterfaces} intf
 * @return {ServiceResolver}
 */

var ServiceResolver = function (_StateMachine) {
  _inherits(ServiceResolver, _StateMachine);

  function ServiceResolver(fullname, intf) {
    _classCallCheck(this, ServiceResolver);

    debug('Creating new resolver for "' + fullname + '"');

    var _this2 = _possibleConstructorReturn(this, (ServiceResolver.__proto__ || Object.getPrototypeOf(ServiceResolver)).call(this, resovlverStates));

    _this2.fullname = fullname;
    _this2._interface = intf;

    var parts = misc.parse(fullname);
    _this2.instance = parts.instance;
    _this2.serviceType = parts.service;
    _this2.protocol = parts.protocol;
    _this2.domain = parts.domain;

    // e.g. _http._tcp.local.
    _this2.ptrname = misc.fqdn(_this2.serviceType, _this2.protocol, _this2.domain);

    // info required for resolution
    _this2.addresses = [];
    _this2.target = null;
    _this2.port = null;
    _this2.txt = null;
    _this2.txtRaw = null;

    // keep one consistent service object so they resolved services can be
    // compared by object reference or kept in a set/map
    _this2._service = {};

    // dirty flag to track changes to service info. gets reset to false before
    // each incoming answer packet is checked.
    _this2._changed = false;

    // offswitch used to communicate with & stop child queries instead of
    // holding onto a reference for each one
    _this2._offswitch = new EventEmitter();

    _this2._batch = [];
    _this2._timers = new TimerContainer(_this2);
    return _this2;
  }

  /**
   * Starts the resolver and parses optional starting records
   * @param {ResourceRecords[]} records
   */


  _createClass(ServiceResolver, [{
    key: 'start',
    value: function start(records) {
      debug('Starting resolver');

      this._addListeners();

      if (records) {
        debug.verbose('Adding initial records: %r', records);
        this._processRecords(records);
      }

      this.isResolved() ? this.transition('resolved') : this.transition('unresolved');
    }
  }, {
    key: 'stop',
    value: function stop() {
      debug('Stopping resolver');
      this.transition('stopped');
    }

    /**
     * Returns the service that has been resolved. Always returns the same obj
     * reference so they can be included in sets/maps or be compared however.
     *
     * addresses/txt/txtRaw are all cloned so any accidental changes to them
     * won't cause problems within the resolver.
     *
     * Ex: {
     *   fullname : 'Instance (2)._http._tcp.local.',
     *   name     : 'Instance (2)',
     *   type     : {name: 'http', protocol: 'tcp'},
     *   domain   : 'local',
     *   host     : 'target.local.',
     *   port     : 8888,
     *   addresses: ['192.168.1.1', '::1'],
     *   txt      : {key: 'value'},
     *   txtRaw   : {key: <Buffer 76 61 6c 75 65>},
     * }
     *
     * @return {object}
     */

  }, {
    key: 'service',
    value: function service() {
      // remove any leading underscores
      var serviceType = this.serviceType.replace(/^_/, '');
      var protocol = this.protocol.replace(/^_/, '');

      // re-assign/update properties
      this._service.fullname = this.fullname;
      this._service.name = this.instance;
      this._service.type = { name: serviceType, protocol: protocol };
      this._service.domain = this.domain;
      this._service.host = this.target;
      this._service.port = this.port;
      this._service.addresses = this.addresses.slice();
      this._service.txt = this.txt ? Object.assign({}, this.txt) : {};
      this._service.txtRaw = this.txtRaw ? Object.assign({}, this.txtRaw) : {};

      // always return same obj
      return this._service;
    }
  }, {
    key: 'isResolved',
    value: function isResolved() {
      return !!this.addresses.length && !!this.target && !!this.port && !!this.txtRaw;
    }

    /**
     * Listen to new answers coming to the interfaces. Do stuff when interface
     * caches report that a record needs to be refreshed or when it expires.
     * Stop on interface errors.
     */

  }, {
    key: '_addListeners',
    value: function _addListeners() {
      var _this3 = this;

      this._interface.using(this).on('answer', this._onAnswer).once('error', function (err) {
        return _this3.transition('stopped', err);
      });

      this._interface.cache.using(this).on('reissue', this._onReissue).on('expired', this._onExpired);
    }
  }, {
    key: '_removeListeners',
    value: function _removeListeners() {
      this._interface.removeListenersCreatedBy(this);
      this._interface.cache.removeListenersCreatedBy(this);
    }
  }, {
    key: '_onAnswer',
    value: function _onAnswer(packet) {
      this.handle('incomingRecords', [].concat(_toConsumableArray(packet.answers), _toConsumableArray(packet.additionals)));
    }

    /**
     * As cached records go stale they need to be refreshed. The cache will ask
     * for updates to records as they reach 80% 85% 90% and 95% of their TTLs.
     * This listens to all reissue events from the cache and checks if the record
     * is relevant to this resolver. If it is, the fsm will handle it based on
     * what state its currently in.
     *
     * If the SRV record needs to be updated the PTR is queried too. Some dumb
     * responders seem more likely to answer the PTR question.
     */

  }, {
    key: '_onReissue',
    value: function _onReissue(record) {
      var isRelevant = record.matches({ name: this.fullname }) || record.matches({ name: this.ptrname, PTRDName: this.fullname }) || record.matches({ name: this.target });

      var isSRV = record.matches({ rrtype: RType.SRV, name: this.fullname });

      if (isRelevant) {
        this.handle('reissue', record);
      }

      if (isSRV) {
        this.handle('reissue', { name: this.ptrname, rrtype: RType.PTR });
      }
    }

    /**
     * Check records as they expire from the cache. This how the resolver learns
     * that a service has died instead of from goodbye records with TTL=0's.
     * Goodbye's only tell the cache to purge the records in 1s and the resolver
     * should ignore those.
     */

  }, {
    key: '_onExpired',
    value: function _onExpired(record) {
      // PTR/SRV: transition to stopped, service is down
      var isDown = record.matches({ rrtype: RType.SRV, name: this.fullname }) || record.matches({ rrtype: RType.PTR, name: this.ptrname, PTRDName: this.fullname });

      // A/AAAA: remove address & transition to unresolved if none are left
      var isAddress = record.matches({ rrtype: RType.A, name: this.target }) || record.matches({ rrtype: RType.AAAA, name: this.target });

      // TXT: remove txt & transition to unresolved
      var isTXT = record.matches({ rrtype: RType.TXT, name: this.fullname });

      if (isDown) {
        debug('Service expired, resolver going down. (%s)', record);
        this.transition('stopped');
      }

      if (isAddress) {
        debug('Address record expired, removing. (%s)', record);

        this.addresses = this.addresses.filter(function (add) {
          return add !== record.address;
        });
        if (!this.addresses.length) this.transition('unresolved');
      }

      if (isTXT) {
        debug('TXT record expired, removing. (%s)', record);
        this.txt = null;
        this.txtRaw = null;
        this.transition('unresolved');
      }
    }

    /**
     * Checks incoming records for changes or updates. Returns true if anything
     * happened.
     *
     * @param  {ResourceRecord[]} incoming
     * @return {boolean}
     */

  }, {
    key: '_processRecords',
    value: function _processRecords(incoming) {
      var _this4 = this;

      // reset changes flag before checking records
      this._changed = false;

      // Ignore TTL 0 records. Get expiration events from the caches instead
      var records = incoming.filter(function (record) {
        return record.ttl > 0;
      });
      if (!records.length) return false;

      var findOne = function findOne(params) {
        return records.find(function (record) {
          return record.matches(params);
        });
      };
      var findAll = function findAll(params) {
        return records.filter(function (record) {
          return record.matches(params);
        });
      };

      // SRV/TXT before A/AAAA, since they contain the target for A/AAAA records
      var SRV = findOne({ rrtype: RType.SRV, name: this.fullname });
      var TXT = findOne({ rrtype: RType.TXT, name: this.fullname });

      if (SRV) this._processSRV(SRV);
      if (TXT) this._processTXT(TXT);

      if (!this.target) return this._changed;

      var As = findAll({ rrtype: RType.A, name: this.target });
      var AAAAs = findAll({ rrtype: RType.AAAA, name: this.target });

      if (As.length) As.forEach(function (A) {
        return _this4._processAddress(A);
      });
      if (AAAAs.length) AAAAs.forEach(function (AAAA) {
        return _this4._processAddress(AAAA);
      });

      return this._changed;
    }
  }, {
    key: '_processSRV',
    value: function _processSRV(record) {
      if (this.port !== record.port) {
        this.port = record.port;
        this._changed = true;
      }

      // if the target changes the addresses are no longer valid
      if (this.target !== record.target) {
        this.target = record.target;
        this.addresses = [];
        this._changed = true;
      }
    }
  }, {
    key: '_processTXT',
    value: function _processTXT(record) {
      if (!misc.equals(this.txtRaw, record.txtRaw)) {
        this.txtRaw = record.txtRaw;
        this.txt = record.txt;
        this._changed = true;
      }
    }
  }, {
    key: '_processAddress',
    value: function _processAddress(record) {
      if (this.addresses.indexOf(record.address) === -1) {
        this.addresses.push(record.address);
        this._changed = true;
      }
    }

    /**
     * Tries to get info that is missing and needed for the service to resolve.
     * Checks the interface caches first and then sends out queries for whatever
     * is still missing.
     */

  }, {
    key: '_queryForMissing',
    value: function _queryForMissing() {
      debug('Getting missing records');

      var questions = [];

      // get missing SRV
      if (!this.target) questions.push({ name: this.fullname, qtype: RType.SRV });

      // get missing TXT
      if (!this.txtRaw) questions.push({ name: this.fullname, qtype: RType.TXT });

      // get missing A/AAAA
      if (this.target && !this.addresses.length) {
        questions.push({ name: this.target, qtype: RType.A });
        questions.push({ name: this.target, qtype: RType.AAAA });
      }

      // check interface caches for answers first
      this._checkCache(questions);

      // send out queries for what is still unanswered
      // (_checkCache may have removed all/some questions from the list)
      if (questions.length) this._sendQueries(questions);
    }

    /**
     * Checks the cache for missing records. Tells the fsm to handle new records
     * if it finds anything
     */

  }, {
    key: '_checkCache',
    value: function _checkCache(questions) {
      var _this5 = this;

      debug('Checking cache for needed records');

      var answers = [];

      // check cache for answers to each question
      questions.forEach(function (question, index) {
        var results = _this5._interface.cache.find(new QueryRecord(question));

        if (results && results.length) {
          // remove answered questions from list
          questions.splice(index, 1);
          answers.push.apply(answers, _toConsumableArray(results));
        }
      });

      // process any found records
      answers.length && this.handle('incomingRecords', answers);
    }

    /**
     * Sends queries out on each interface for needed records. Queries are
     * continuous, they keep asking until they get the records or until they
     * are stopped by the resolver with `this._cancelQueries()`.
     */

  }, {
    key: '_sendQueries',
    value: function _sendQueries(questions) {
      debug('Sending queries for needed records');

      // stop any existing queries, they might be stale now
      this._cancelQueries();

      // no 'answer' event handler here because this resolver is already
      // listening to the interface 'answer' event
      new Query(this._interface, this._offswitch).ignoreCache(true).add(questions).start();
    }

    /**
     * Reissue events from the cache are slightly randomized for each record's TTL
     * (80-82%, 85-87% of the TTL, etc) so reissue queries are batched here to
     * prevent a bunch of outgoing queries from being sent back to back 10ms apart.
     */

  }, {
    key: '_batchReissue',
    value: function _batchReissue(record) {
      var _this6 = this;

      debug('Batching record for reissue %s', record);

      this._batch.push(record);

      if (!this._timers.has('batch')) {
        this._timers.setLazy('batch', function () {
          _this6._sendReissueQuery(_this6._batch);
          _this6._batch = [];
        }, 1 * 1000);
      }
    }

    /**
     * Asks for updates to records. Only sends one query out (non-continuous).
     */

  }, {
    key: '_sendReissueQuery',
    value: function _sendReissueQuery(records) {
      debug('Reissuing query for cached records: %r', records);

      var questions = records.map(function (_ref) {
        var name = _ref.name,
            rrtype = _ref.rrtype;
        return { name: name, qtype: rrtype };
      });

      new Query(this._interface, this._offswitch).continuous(false) // only send query once, don't need repeats
      .ignoreCache(true) // ignore cache, trying to renew this record
      .add(questions).start();
    }
  }, {
    key: '_cancelQueries',
    value: function _cancelQueries() {
      debug('Sending stop signal to active queries & canceling batched');
      this._offswitch.emit('stop');
      this._timers.clear('batch');
    }
  }]);

  return ServiceResolver;
}(StateMachine);

module.exports = ServiceResolver;
}).call(this)}).call(this,"/node_modules/dnssd/lib/ServiceResolver.js")
},{"./EventEmitter":69,"./Query":75,"./QueryRecord":76,"./StateMachine":83,"./TimerContainer":84,"./constants":85,"./debug":87,"./misc":90,"path":27}],82:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var validate = require('./validate');
var ValidationError = require('./customError').create('ValidationError');

/**
 * Creates a new ServiceType
 * @class
 *
 * Used to turn some input into a reliable service type for advertisements and
 * browsers. Does validation on input, throwing errors if there's a problem.
 *
 * Name and protocol are always required, subtypes are optional.
 *
 * String (single argument):
 *   '_http._tcp'
 *   '_http._tcp,mysubtype,anothersub'
 *
 * Object (single argument):
 *   {
 *     name:     '_http',
 *     protocol: '_tcp',
 *     subtypes: ['mysubtype', 'anothersub'],
 *   }
 *
 * Array (single argument):
 *   ['_http', '_tcp', ['mysubtype', 'anothersub']]
 *   ['_http', '_tcp', 'mysubtype', 'anothersub']
 *
 * Strings (multiple arguments):
 *   '_http', '_tcp'
 *   '_http', '_tcp', 'mysubtype', 'anothersub'
 *
 * Validation step is forgiving about required leading underscores and
 * will add them it missing. So 'http.tcp' would be the same as '_http._tcp'.
 *
 * @param {string|object|array|...string} arguments
 */

var ServiceType = function () {
  function ServiceType() {
    _classCallCheck(this, ServiceType);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var input = args.length === 1 ? args[0] : args;

    this.name = null;
    this.protocol = null;
    this.subtypes = [];
    this.isEnumerator = false;

    var type = typeof input === 'undefined' ? 'undefined' : _typeof(input);

    if (type === 'string') this._fromString(input);else if (Array.isArray(input)) this._fromArray(input);else if (type === 'object') this._fromObj(input);else {
      throw new ValidationError('Argument must be string, obj, or array. got %s', type);
    }

    this._validate();
  }

  /**
   * Creates a new ServiceType with tcp protocol
   * Ex:
   *   ServiceType.tcp('_http')
   *   ServiceType.tcp('_http', 'sub1', 'sub2')
   *   ServiceType.tcp(['_http', 'sub1', 'sub2'])
   *
   * @param  {string|array|...string} arguments
   * @return {ServiceType}
   */


  _createClass(ServiceType, [{
    key: '_fromString',


    /**
     * Parse a string into service parts
     * Ex:
     *   '_http._tcp'
     *   '_http._tcp,mysubtype,anothersub'
     */
    value: function _fromString(str) {
      // trim off weird whitespace and extra trailing commas
      var parts = str.replace(/^[ ,]+|[ ,]+$/g, '').split(',').map(function (s) {
        return s.trim();
      });

      this.name = parts[0].split('.').slice(0, -1).join('.');
      this.protocol = parts[0].split('.').slice(-1)[0];
      this.subtypes = parts.slice(1);
    }

    /**
     * Parse an array into service parts
     * Ex:
     *   ['_http', '_tcp', ['mysubtype', 'anothersub']]
     *   ['_http', '_tcp', 'mysubtype', 'anothersub']
     */

  }, {
    key: '_fromArray',
    value: function _fromArray(_ref) {
      var _ref3;

      var _ref2 = _toArray(_ref),
          name = _ref2[0],
          protocol = _ref2[1],
          subtypes = _ref2.slice(2);

      this._fromObj({
        name: name,
        protocol: protocol,
        subtypes: (_ref3 = []).concat.apply(_ref3, _toConsumableArray(subtypes))
      });
    }

    /**
     * Parse an object into service parts
     * Ex: {
     *   name:     '_http',
     *   protocol: '_tcp',
     *   subtypes: ['mysubtype', 'anothersub'],
     * }
     */

  }, {
    key: '_fromObj',
    value: function _fromObj(_ref4) {
      var name = _ref4.name,
          protocol = _ref4.protocol,
          _ref4$subtypes = _ref4.subtypes,
          subtypes = _ref4$subtypes === undefined ? [] : _ref4$subtypes;

      this.name = name;
      this.protocol = protocol;
      this.subtypes = Array.isArray(subtypes) ? subtypes : [subtypes];
    }

    /**
     * Validates service name, protocol, and subtypes. Throws if any of them
     * are invalid.
     */

  }, {
    key: '_validate',
    value: function _validate() {
      if (typeof this.name !== 'string') {
        throw new ValidationError('Service name must be a string, got %s', _typeof(this.name));
      }

      if (!this.name) {
        throw new ValidationError("Service name can't be empty");
      }

      if (typeof this.protocol !== 'string') {
        throw new ValidationError('Protocol must be a string, got %s', _typeof(this.protocol));
      }

      if (!this.protocol) {
        throw new ValidationError("Protocol can't be empty");
      }

      // massage properties a little before validating
      // be lenient about underscores, add when missing
      if (this.name.substr(0, 1) !== '_') this.name = '_' + this.name;
      if (this.protocol.substr(0, 1) !== '_') this.protocol = '_' + this.protocol;

      // special case: check this service type is the service enumerator
      if (this.name === '_services._dns-sd' && this.protocol === '_udp') {
        this.isEnumerator = true;

        // enumerators shouldn't have subtypes
        this.subtypes = [];

        // skip validation for service enumerators, they would fail since
        // '_services._dns-sd' is getting shoehorned into this.name
        return;
      }

      validate.serviceName(this.name);
      validate.protocol(this.protocol);
      this.subtypes.forEach(function (subtype) {
        return validate.label(subtype, 'Subtype');
      });
    }

    /**
     * A string representation of the service
     * ex: '_http._tcp,sub1,sub2'
     */

  }, {
    key: 'toString',
    value: function toString() {
      return this.subtypes.length ? this.name + '.' + this.protocol + ',' + this.subtypes.join(',') : this.name + '.' + this.protocol;
    }
  }], [{
    key: 'tcp',
    value: function tcp() {
      var _ref5;

      // insert protocol in the right spot (second arg)
      var input = (_ref5 = []).concat.apply(_ref5, arguments);
      input.splice(1, 0, '_tcp');

      return new ServiceType(input);
    }

    /**
     * Creates a new ServiceType with udp protocol
     * Ex:
     *   ServiceType.tcp('_sleep-proxy,sub1,sub2')
     *   ServiceType.tcp('_sleep-proxy', 'sub1', 'sub2')
     *   ServiceType.tcp(['_sleep-proxy', 'sub1', 'sub2'])
     *
     * @param  {string|array|...string} [arguments]
     * @return {ServiceType}
     */

  }, {
    key: 'udp',
    value: function udp() {
      var _ref6;

      // insert protocol in the right spot (second arg)
      var input = (_ref6 = []).concat.apply(_ref6, arguments);
      input.splice(1, 0, '_udp');

      return new ServiceType(input);
    }

    /**
     * Creates a new service enumerator
     * @return {ServiceType}
     */

  }, {
    key: 'all',
    value: function all() {
      return new ServiceType('_services._dns-sd._udp');
    }
  }]);

  return ServiceType;
}();

module.exports = ServiceType;
},{"./customError":86,"./validate":93}],83:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var events = require('events');

var has = function has(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

var StateMachine = function () {
  function StateMachine(states) {
    _classCallCheck(this, StateMachine);

    this.state = '';
    this.prevState = '';
    this.states = states;

    var emitter = new events.EventEmitter();
    this.emit = emitter.emit.bind(emitter);
    this.once = emitter.once.bind(emitter);
    this.on = emitter.on.bind(emitter);
    this.off = emitter.removeListener.bind(emitter);
  }

  _createClass(StateMachine, [{
    key: '_apply',
    value: function _apply(state, fn) {
      if (has(this.states, state) && has(this.states[state], fn)) {
        var _states$state$fn;

        for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }

        (_states$state$fn = this.states[state][fn]).call.apply(_states$state$fn, [this].concat(args));
      }
    }
  }, {
    key: 'transition',
    value: function transition(to) {
      if (!has(this.states, to)) {
        throw new Error('Can\'t transition, state ' + to + ' doesn\'t exist!');
      }

      this.prevState = this.state;
      this.state = to;

      this._apply(this.prevState, 'exit');

      for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      this._apply.apply(this, [this.state, 'enter'].concat(args));
    }
  }, {
    key: 'handle',
    value: function handle(input) {
      for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }

      this._apply.apply(this, [this.state, input].concat(args));
    }
  }]);

  return StateMachine;
}();

module.exports = StateMachine;
},{"events":9}],84:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var counter = 0;
var uniqueId = function uniqueId() {
  return ++counter;
};

/**
 * TimerContainer is a convenience wrapper for setting/clearing timers
 * plus "lazy" timers that won't fire after waking from sleep.
 * @class
 *
 *  Instead of this:
 *     this.timeout = setTimeout(this.stop.bind(this));
 *     this.doSomehting = setTimeout(...);
 *     this.doThat = setTimeout(...);
 *     ... x10
 *
 *     clearTimeout(this.timeout)      <-- have to keep track of each
 *     clearTimeout(this.doSomething)
 *     clearTimeout(this.doThat)
 *
 * Do this:
 *     this.timers = new TimerContext(this);
 *     this.timers.set('timeout', this.stop, 1000);
 *     this.timers.set(fn1, 100);
 *     this.timers.set(fn2, 200);
 *     ...
 *
 *     this.timers.clear(); <-- clears all, only need to track this.timers
 *
 * Lazy timers that won't fire when walking from sleep. If a js timer
 * is set and the machine goes to sleep the timer will fire as soon as the
 * machine wakes from sleep. This behavior isn't always wanted. Lazy timers
 * won't fire if they are going off later than they are supposed to.
 *
 * Ex:
 *     timers.setLazy(doTimeSensitive, 1000)
 *     > machine sleeps for 1hr
 *     > machine wakes
 *     > doTimeSensitive doesn't fire
 *
 */

var TimerContainer = function () {
  /**
   * Optional context. If used timer functions will be applied with it.
   * @param {object} [context]
   */
  function TimerContainer(context) {
    _classCallCheck(this, TimerContainer);

    this._context = context;
    this._timers = {};
    this._lazyTimers = {};
  }

  _createClass(TimerContainer, [{
    key: "has",
    value: function has(id) {
      return this._timers.hasOwnProperty(id) || this._lazyTimers.hasOwnProperty(id);
    }
  }, {
    key: "count",
    value: function count() {
      return Object.keys(this._timers).length + Object.keys(this._lazyTimers).length;
    }

    /**
     * Set a normal timeout (like plain setTimeout)
     *
     * @param {string}   [id] - optional id for timer (so it can be cleared by id later)
     * @param {function} fn
     * @param {number}   delay
     */

  }, {
    key: "set",
    value: function set() {
      var _this = this;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var delay = args.pop();
      var fn = args.pop();
      var id = args.length ? args.pop() : uniqueId();

      // clear previous duplicates
      if (this._timers[id]) this.clear(id);

      this._timers[id] = setTimeout(function () {
        // remove timer key BERORE running the fn
        // (fn could set another timer with the same id, screwing everything up)
        delete _this._timers[id];
        fn.call(_this._context);
      }, delay);
    }

    /**
     * Set a 'lazy' timeout that won't call it's fn if the timer fires later
     * than expected. (Won't fire after waking from sleep.)
     *
     * @param {string}   [id] - optional id for timer (so it can be cleared by id later)
     * @param {function} fn
     * @param {number}   delay
     */

  }, {
    key: "setLazy",
    value: function setLazy() {
      var _this2 = this;

      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var delay = args.pop();
      var fn = args.pop();
      var id = args.length ? args.pop() : uniqueId();

      // expect timer to fire after delay +- 5s fudge factor
      // only fire fn if the timer is firing when it was expected to (not after
      // waking from sleep)
      var finish = Date.now() + delay + 5 * 1000;

      // clear previous duplicates
      if (this._lazyTimers[id]) this.clear(id);

      this._lazyTimers[id] = setTimeout(function () {
        // remove timer key BERORE running the fn
        // (fn could set another timer with the same id)
        delete _this2._lazyTimers[id];
        if (Date.now() < finish) fn.call(_this2._context);
      }, delay);
    }

    /**
     * Clear specific timer or clear all
     * @param {string} [id] - specific timer to clear
     */

  }, {
    key: "clear",
    value: function clear(id) {
      var _this3 = this;

      if (!id) {
        Object.keys(this._timers).forEach(function (timer) {
          return _this3.clear(timer);
        });
        Object.keys(this._lazyTimers).forEach(function (timer) {
          return _this3.clear(timer);
        });
      }

      if (this._timers.hasOwnProperty(id)) {
        clearTimeout(this._timers[id]);
        delete this._timers[id];
      }

      if (this._lazyTimers.hasOwnProperty(id)) {
        clearTimeout(this._lazyTimers[id]);
        delete this._lazyTimers[id];
      }
    }
  }]);

  return TimerContainer;
}();

module.exports = TimerContainer;
},{}],85:[function(require,module,exports){
'use strict';

module.exports.RType = {
  A: 1,
  PTR: 12,
  TXT: 16,
  AAAA: 28,
  SRV: 33,
  NSEC: 47,
  ANY: 255
};

module.exports.RClass = {
  IN: 1,
  ANY: 255
};

module.exports.RNums = {
  1: 'A',
  12: 'PTR',
  16: 'TXT',
  28: 'AAAA',
  33: 'SRV',
  47: 'NSEC',
  255: 'ANY'
};
},{}],86:[function(require,module,exports){
'use strict';

var misc = require('./misc');

/**
 * Custom error type w/ msg formatting
 *
 * const MyError = customError.create('MyError');
 * throw new MyError('Msg %s %d', 'stuff', 10);
 *
 * @param  {string} errorType
 * @return {Error}
 */
module.exports.create = function createErrorType(errorType) {
  function CustomError(message) {
    this.name = errorType;

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    this.message = misc.format.apply(misc, [message].concat(args));

    Error.captureStackTrace(this, CustomError);
  }

  CustomError.prototype = Object.create(Error.prototype);
  CustomError.prototype.constructor = CustomError;

  return CustomError;
};
},{"./misc":90}],87:[function(require,module,exports){
(function (process){(function (){
'use strict';

var misc = require('./misc');

var enabledNamespaces = [];
var disabledNamespaces = [];

var enabledVerbose = [];
var disabledVerbose = [];

var colors = ['blue', 'green', 'magenta', 'yellow', 'cyan', 'red'];
var colorsIndex = 0;

var noop = function noop() {};
noop.verbose = noop;
noop.v = noop;
noop.isEnabled = false;
noop.verbose.isEnabled = false;
noop.v.isEnabled = false;

var logger = console.log;

// initialize
if (process.env.DEBUG) {
  process.env.DEBUG.replace(/\*/g, '.*?').split(',').filter(function (s) {
    return !!s;
  }).forEach(function (namespace) {
    namespace.substr(0, 1) === '-' ? disabledNamespaces.push(namespace.substr(1)) : enabledNamespaces.push(namespace);
  });
}

if (process.env.VERBOSE) {
  process.env.VERBOSE.replace(/\*/g, '.*?').split(',').filter(function (s) {
    return !!s;
  }).forEach(function (namespace) {
    namespace.substr(0, 1) === '-' ? disabledVerbose.push(namespace.substr(1)) : enabledVerbose.push(namespace);
  });
}

function namespaceIsEnabled(name) {
  if (!enabledNamespaces.length) return false;

  function matches(namespace) {
    return name.match(new RegExp('^' + namespace + '$'));
  }

  if (disabledNamespaces.some(matches)) return false;
  if (enabledNamespaces.some(matches)) return true;

  return false;
}

function namespaceIsVerbose(name) {
  if (!enabledVerbose.length) return false;

  function matches(namespace) {
    return name.match(new RegExp('^' + namespace + '$'));
  }

  if (disabledVerbose.some(matches)) return false;
  if (enabledVerbose.some(matches)) return true;

  return false;
}

function timestamp() {
  var now = new Date();

  var time = [misc.padStart(now.getHours(), 2, '0'), misc.padStart(now.getMinutes(), 2, '0'), misc.padStart(now.getSeconds(), 2, '0'), misc.padStart(now.getMilliseconds(), 3, '0')];

  return '[' + time.join(':') + ']';
}

/**
 * Returns debug fn if debug is enabled, noop if not
 *
 * @param  {string} namespace
 * @return {function}
 */
module.exports = function debug(namespace) {
  if (!namespaceIsEnabled(namespace)) return noop;

  // shorten Zeroconf:filename.js -> filename… becuase its driving me crazy
  var shortname = namespace.replace('dnssd:', '');
  if (shortname.length > 10) shortname = shortname.substr(0, 9) + '…';
  if (shortname.length < 10) shortname = misc.pad(shortname, 10);

  var color = colors[colorsIndex++ % colors.length];
  var prefix = misc.color('•' + shortname, color);

  function logFn(msg) {
    // '•Query.js [10:41:54:482] '
    var output = prefix + ' ' + misc.color(timestamp(), 'grey') + ' ';

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    output += misc.format.apply(misc, [msg].concat(args));

    logger(output);
  }

  logFn.isEnabled = true;

  if (namespaceIsVerbose(namespace)) {
    logFn.verbose = logFn;
    logFn.v = logFn;
    logFn.verbose.isEnabled = true;
    logFn.v.isEnabled = true;
  } else {
    logFn.verbose = noop;
    logFn.v = noop;
  }

  return logFn;
};
}).call(this)}).call(this,require('_process'))
},{"./misc":90,"_process":28}],88:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * Deterministic JSON.stringify for resource record stuff
 *
 * Object keys are sorted so strings are always the same independent of
 * what order properties were added in. Strings are lowercased because
 * record names, TXT keys, SRV target names, etc. need to be compared
 * case-insensitively.
 *
 * @param  {*} val
 * @return {string}
 */
function stringify(val) {
  if (typeof val === 'string') return JSON.stringify(val.toLowerCase());

  if (Array.isArray(val)) return '[' + val.map(stringify) + ']';

  if ((typeof val === 'undefined' ? 'undefined' : _typeof(val)) === 'object' && '' + val === '[object Object]') {
    var str = Object.keys(val).sort().map(function (key) {
      return stringify(key) + ':' + stringify(val[key]);
    }).join(',');

    return '{' + str + '}';
  }

  return JSON.stringify(val);
}

/**
 * djb2 string hashing function
 *
 * @param  {string} str
 * @return {string} - 32b unsigned hex
 */
function djb2(str) {
  var hash = 5381;
  var i = str.length;

  // hash stays signed 32b with XOR operator
  while (i) {
    hash = hash * 33 ^ str.charCodeAt(--i);
  } // coerce to unsigned to get strings without -'s
  return (hash >>> 0).toString(16);
}

/**
 * Takes any number of parameters and makes a string hash of them.
 * @return {...*} arguments
 */
module.exports = function hash() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return djb2(stringify(args));
};
},{}],89:[function(require,module,exports){
'use strict';

var misc = require('./misc');

function chunk(arr, size) {
  var i = 0;
  var j = 0;
  var chunked = new Array(Math.ceil(arr.length / size));

  while (i < arr.length) {
    chunked[j++] = arr.slice(i, i += size);
  }

  return chunked;
}

/**
 * Dumps packet buffers to an easier to look at string:
 *
 * XX XX XX XX XX XX XX XX XX XX XX XX XX XX XX XX  ...ascii...!....
 * XX XX XX XX XX XX XX XX XX XX XX XX XX XX XX XX  .asdf...........
 * XX XX XX XX XX XX XX XX XX XX XX XX XX XX XX XX  .........asdf...
 * XX XX XX XX XX XX XX XX XX                       .........
 *
 * DNS name compression pointers shown in magenta
 *
 * @param  {Buffer} buffer
 * @return {string}
 */
module.exports.view = function view(buffer) {
  // chunk buffer into lines of 16 octets each, like:
  // [
  //  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  //  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  //  [1, 2, 3, 4, 5, 6, 7]
  // ]
  var lines = chunk(buffer, 16);

  // keep track of DNS name compression pointers since they are 2 bytes long
  // and we are only looking at 1 byte at a time per line in the loop
  var lastCharacterWasPtr = false;

  // turn each line into a str representation and join with newline
  return lines.map(function (octets) {
    var hexChars = [];
    var asciiChars = [];

    // byte by byte marking pointers and ascii chars as they appear
    octets.forEach(function (octet) {
      // individual chars
      var ascii = String.fromCharCode(octet);
      var hex = misc.padStart(octet.toString(16), 2, '0');

      // crazy regex range from ' ' to '~' (printable ascii)
      var isPrintableAscii = /[ -~]/.test(ascii);
      var currentCharIsPtr = octet >= 192;

      // DNS name compression pointers are 2 octets long,
      // and can occur back to back
      if (currentCharIsPtr || lastCharacterWasPtr) {
        hex = misc.color(hex, 'magenta', true);
        ascii = misc.color('.', 'white', true);
      } else if (isPrintableAscii) {
        hex = misc.color(hex, 'blue');
      } else {
        ascii = misc.color('.', 'grey');
      }

      hexChars.push(hex);
      asciiChars.push(ascii);

      lastCharacterWasPtr = currentCharIsPtr;
    });

    // pad with 2 empty spaces so each line is the same length
    // when printed
    while (hexChars.length < 16) {
      hexChars.push('  ');
    } // str representation of this line
    // XX XX XX XX XX XX XX XX XX XX XX XX XX XX XX XX  ...ascii...!....
    return hexChars.join(' ') + '  ' + asciiChars.join('');
  }).join('\n');
};
},{"./misc":90}],90:[function(require,module,exports){
(function (Buffer){(function (){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var os = require('os');
var util = require('util');

var remove_colors_re = /\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[m|K]/g;

/**
 * Makes a fully qualified domain name from dns labels
 *
 * @param  {...string}
 * @return {string}
 */
module.exports.fqdn = function () {
  for (var _len = arguments.length, labels = Array(_len), _key = 0; _key < _len; _key++) {
    labels[_key] = arguments[_key];
  }

  var name = labels.join('.');
  return name.substr(-1) === '.' ? name : name + '.';
};

/**
 * Get hostname. Strips .local if os.hostname includes it
 * @return {string}
 */
module.exports.hostname = function () {
  return os.hostname().replace(/.local\.?$/, '');
};

/**
 * Parses a resource record name into instance, service type, etc
 *
 * Deals with these name formats:
 * -       Instance . _service . _protocol . domain .
 * - Subtype . _sub . _service . _protocol . domain .
 * -                  _service . _protocol . domain .
 * - Single_Label_Host . local .
 *
 * If name fails to parse as expected, it returns an empty obj.
 *
 * @param  {string}
 * @return {object}
 */
module.exports.parse = function (fullname) {
  var obj = {};

  // a full registration name, eg:
  // - '_http._tcp.local.'
  // - 'Instance No. 1._http._tcp.local.'
  // - 'SubTypeName._sub._http._tcp.local.'
  if (!!~fullname.indexOf('._tcp.') || !!~fullname.indexOf('._udp.')) {
    obj.protocol = !!~fullname.indexOf('._tcp.') ? '_tcp' : '_udp';

    // [['Instance No', ' 1', '_http'], [local]]
    var parts = fullname.split(obj.protocol).map(function (part) {
      return part.split('.').filter(function (p) {
        return !!p;
      });
    });

    obj.domain = parts[1].join('.'); // 'local'
    obj.service = parts[0].pop(); // '_http'

    if (parts[0].slice(-1)[0] === '_sub') {
      obj.subtype = parts[0].slice(0, -1).join('.'); // 'SubTypeName'
    } else {
      obj.instance = parts[0].join('.'); // 'Instance No. 1'
    }

    // a 2 label domain name, eg: 'Machine.Name.local.'
  } else if (fullname.match(/local$|local\.$/)) {
    obj.instance = fullname.split('.local').shift(); // Machine.Name
    obj.domain = 'local';
  }

  return obj;
};

module.exports.pad = function (value, len) {
  var fill = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ' ';

  var str = String(value);
  var needed = len - str.length;
  return needed > 0 ? str + fill.repeat(needed) : str;
};

module.exports.padStart = function (value, len) {
  var fill = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ' ';

  var str = String(value);
  var needed = len - str.length;
  return needed > 0 ? fill.repeat(needed) + str : str;
};

/**
 * Visually padEnd. Adding colors to strings adds escape sequences that
 * make it a color but also adds characters to str.length that aren't
 * displayed.
 *
 * @param  {string} str
 * @param  {number} num
 * @return {string}
 */
function visualPad(str, num) {
  var needed = num - str.replace(remove_colors_re, '').length;

  return needed > 0 ? str + ' '.repeat(needed) : str;
}

/**
 * Make a table of records strings that have equal column lengths.
 *
 * Ex, turn groups of records:
 * [
 *   [
 *     Host.local. * QU,
 *   ]
 *   [
 *     Host.local. A 10 169.254.132.42,
 *     Host.local. AAAA 10 fe80::c17c:ec1c:530d:842a,
 *   ]
 * ]
 *
 * into a more readable form that can be printed:
 * [
 *   [
 *     'Host.local. *    QU'
 *   ]
 *   [
 *     'Host.local. A    10 169.254.132.42'
 *     'Host.local. AAAA 10 fe80::c17c:ec1c:530d:842a'
 *   ]
 * ]
 *
 * @param  {...ResourceRecords[]} groups
 * @return {string[][]}
 */
function alignRecords() {
  var colWidths = [];
  var result = void 0;

  // Get max size for each column (have to look at all records)

  for (var _len2 = arguments.length, groups = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    groups[_key2] = arguments[_key2];
  }

  result = groups.map(function (records) {
    return records.map(function (record) {
      // break record into parts
      var parts = record.toParts();

      parts.forEach(function (part, i) {
        var len = part.replace(remove_colors_re, '').length;

        if (!colWidths[i]) colWidths[i] = 0;
        if (len > colWidths[i]) colWidths[i] = len;
      });

      return parts;
    });
  });

  // Add padding:
  result = result.map(function (records) {
    return records.map(function (recordParts) {
      return recordParts.map(function (part, i) {
        return visualPad(part, colWidths[i]);
      }).join(' ');
    });
  });

  return result;
}

module.exports.alignRecords = alignRecords;

/**
 * Makes a "raw" txt obj for TXT records. A "raw" obj will have string values
 * converted to buffers since TXT key values are just opaque binary data. False
 * values are removed since they aren't sent (missing key = implied false).
 *
 * {key: 'value'} => {'key': <Buffer 76 61 6c 75 65>}
 * {key: true}    => {key: true}
 * {key: null}    => {key: null}
 * {key: false}   => {}
 *
 * @param  {object} obj
 * @return {object} - a new object, original not modified
 */
module.exports.makeRawTXT = function (obj) {
  var result = {};

  Object.keys(obj).filter(function (key) {
    return obj[key] !== false;
  }).forEach(function (key) {
    var value = obj[key];

    result[key] = typeof value === 'string' ? Buffer.alloc(value.length, value) : value;
  });

  return result;
};

/**
 * Makes a more readable txt obj for TXT records. Buffers are converted to
 * utf8 strings, which is likely what you want anyway.
 *
 * @param  {object} obj
 * @return {object} - a new object, original not modified
 */
module.exports.makeReadableTXT = function (obj) {
  var result = {};

  Object.keys(obj).filter(function (key) {
    return obj[key] !== false;
  }).forEach(function (key) {
    var value = obj[key];
    result[key] = Buffer.isBuffer(value) ? value.toString() : value;
  });

  return result;
};

module.exports.defaults = function (obj, defaults) {
  Object.keys(defaults).forEach(function (key) {
    if (!obj.hasOwnProperty(key)) obj[key] = defaults[key];
  });
};

module.exports.random = function (min, max) {
  return Math.random() * (max - min) + min;
};

module.exports.color = function (str) {
  var color = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'white';
  var bright = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var colors = {
    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    magenta: 35,
    cyan: 36,
    white: 37,
    grey: 90 // bright black
  };

  var code = (colors[color] || 37) + (bright ? 60 : 0);

  return '\x1B[' + code + 'm' + str + '\x1B[0m';
};

module.exports.bg = function (str) {
  var color = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'white';
  var bright = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var colors = {
    black: 40,
    red: 41,
    green: 42,
    yellow: 43,
    blue: 44,
    magenta: 45,
    cyan: 46,
    white: 47,
    grey: 100 // bright black
  };

  var code = (colors[color] || 40) + (bright ? 60 : 0);

  return '\x1B[' + code + 'm' + str + '\x1B[0m';
};

module.exports.truncate = function (str, len) {
  var end = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '…';

  return str.length < len ? str : str.slice(0, len) + end;
};

function stringify() {
  var arg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

  if (type === '%s' || type === '%d') {
    return String(arg);
  }

  // check that each item has the .toParts() method that misc.alignRecords uses
  // or else it will throw
  if (type === '%r') {
    if (Array.isArray(arg) && arg.every(function (record) {
      return 'toParts' in record;
    })) {
      return '\n' + alignRecords(arg).map(function (group) {
        return group.join('\n');
      }).join('\n');
    }

    return String(arg);
  }

  // util.inspect has pretty colors for objects
  if ((typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object') {
    var str = util.inspect(arg, { colors: true });
    return str.match('\n') ? '\n' + str + '\n' : str;
  }

  return String(arg);
}

module.exports.format = function (msg) {
  for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
    args[_key3 - 1] = arguments[_key3];
  }

  var hasFormatters = typeof msg === 'string' && msg.match(/%[a-z]/);

  // replace each format marker in message string with the formatted arg
  // (or just add formatted message to output if no args)
  var output = hasFormatters && args.length ? msg.replace(/%([a-z])/g, function (type) {
    return stringify(args.shift(), type);
  }) : stringify(msg);

  // add padding for printing surplus args left over
  if (args.length) output += ' ';

  // print args that didn't have a formatter
  output += args.map(function (arg) {
    return stringify(arg);
  }).join(' ');

  // remove hanging newline at end and add indentation
  output = output.replace(/\n$/, '');
  output = output.replace(/\n/g, '\n    ');

  return output;
};

/**
 * Map fn() n times
 */
module.exports.map_n = function (fn, n) {
  var results = [];

  for (var i = 0; i < n; i++) {
    results.push(fn());
  }

  return results;
};

/**
 * Call fn after n calls
 */
module.exports.after_n = function (fn, n) {
  var count = n;

  return function () {
    count--;
    if (count <= 0) return fn.apply(undefined, arguments);
  };
};

/**
 * Deep equality check
 */
module.exports.equals = function equals(a, b) {
  if (a === b) return true;
  if (typeof a !== 'undefined' && typeof b === 'undefined') return false;
  if (typeof a === 'undefined' && typeof b !== 'undefined') return false;

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; i++) {
      if (!equals(a[i], b[i])) return false;
    }

    return true;
  }

  if (a instanceof Object && b instanceof Object) {
    var a_keys = Object.keys(a);
    var b_keys = Object.keys(b);

    if (a_keys.length !== b_keys.length) {
      return false;
    }

    return a_keys.every(function (key) {
      return equals(a[key], b[key]);
    });
  }

  return false;
};
}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":5,"os":26,"util":60}],91:[function(require,module,exports){
(function (__filename){(function (){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var Query = require('./Query');
var ServiceResolver = require('./ServiceResolver');
var DisposableInterface = require('./DisposableInterface');

var EventEmitter = require('./EventEmitter');
var ValidationError = require('./customError').create('ValidationError');

var filename = require('path').basename(__filename);
var debug = require('./debug')('dnssd:' + filename);

var RType = require('./constants').RType;

function runQuery(name, qtype) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  debug('Resolving ' + name + ', type: ' + qtype);

  var timeout = options.timeout || 2000;
  var question = { name: name, qtype: qtype };

  var intf = DisposableInterface.create(options.interface);
  var killswitch = new EventEmitter();

  return new Promise(function (resolve, reject) {
    function stop() {
      killswitch.emit('stop');
      intf.stop();
    }

    function sendQuery() {
      new Query(intf, killswitch).continuous(false).setTimeout(timeout).add(question).once('answer', function (answer, related) {
        stop();
        resolve({ answer: answer, related: related });
      }).once('timeout', function () {
        stop();
        reject(new Error('Resolve query timed out'));
      }).start();
    }

    intf.bind().then(sendQuery).catch(reject);
  });
}

function resolveAny(name, type) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var qtype = void 0;

  if (typeof name !== 'string') {
    throw new ValidationError('Name must be a string, got %s', typeof name === 'undefined' ? 'undefined' : _typeof(name));
  }

  if (!name.length) {
    throw new ValidationError("Name can't be empty");
  }

  if (typeof type === 'string') qtype = RType[type.toUpperCase()];
  if (Number.isInteger(type)) qtype = type;

  if (!qtype || qtype <= 0 || qtype > 0xFFFF) {
    throw new ValidationError('Unknown query type, got "%s"', type);
  }

  if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) !== 'object') {
    throw new ValidationError('Options must be an object, got %s', typeof options === 'undefined' ? 'undefined' : _typeof(options));
  }

  if (options.interface && !DisposableInterface.isValidName(options.interface)) {
    throw new ValidationError('Interface "' + options.interface + '" doesn\'t exist');
  }

  if (name.substr(-1) !== '.') name += '.'; // make sure root label exists

  return runQuery(name, qtype, options);
}

function resolve4(name, opts) {
  return resolveAny(name, 'A', opts).then(function (result) {
    return result.answer.address;
  });
}

function resolve6(name, opts) {
  return resolveAny(name, 'AAAA', opts).then(function (result) {
    return result.answer.address;
  });
}

function resolveSRV(name, opts) {
  return resolveAny(name, 'SRV', opts).then(function (result) {
    return { target: result.answer.target, port: result.answer.port };
  });
}

function resolveTXT(name, opts) {
  return resolveAny(name, 'TXT', opts).then(function (result) {
    return { txt: result.answer.txt, txtRaw: result.answer.txtRaw };
  });
}

function resolveService(name) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  debug('Resolving service: ' + name);

  var timeout = options.timeout || 2000;

  if (typeof name !== 'string') {
    throw new ValidationError('Name must be a string, got %s', typeof name === 'undefined' ? 'undefined' : _typeof(name));
  }

  if (!name.length) {
    throw new ValidationError("Name can't be empty");
  }

  if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) !== 'object') {
    throw new ValidationError('Options must be an object, got %s', typeof options === 'undefined' ? 'undefined' : _typeof(options));
  }

  if (options.interface && !DisposableInterface.isValidName(options.interface)) {
    throw new ValidationError('Interface "' + options.interface + '" doesn\'t exist');
  }

  if (name.substr(-1) !== '.') name += '.'; // make sure root label exists

  var intf = DisposableInterface.create(options.interface);
  var resolver = new ServiceResolver(name, intf);

  function stop() {
    resolver.stop();
    intf.stop();
  }

  function startResolver() {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error('Resolve service timed out'));
        stop();
      }, timeout);

      resolver.once('resolved', function () {
        resolve(resolver.service());
        stop();
        clearTimeout(timer);
      });

      resolver.start();
    });
  }

  return intf.bind().then(startResolver);
}

module.exports = {
  resolve: resolveAny,
  resolve4: resolve4,
  resolve6: resolve6,
  resolveSRV: resolveSRV,
  resolveTXT: resolveTXT,
  resolveService: resolveService
};
}).call(this)}).call(this,"/node_modules/dnssd/lib/resolve.js")
},{"./DisposableInterface":68,"./EventEmitter":69,"./Query":75,"./ServiceResolver":81,"./constants":85,"./customError":86,"./debug":87,"path":27}],92:[function(require,module,exports){
'use strict';

// Periodically checks for sleep. The interval timer should fire within
// expected range. If it fires later than  expected, it's probably because
// it's coming back from sleep.

var EventEmitter = require('./EventEmitter');

var sleep = new EventEmitter();
var frequency = 60 * 1000; // check for sleep once a minute
var fudge = 5 * 1000;
var last = Date.now();

var interval = setInterval(function checkSleep() {
  var now = Date.now();
  var expected = last + frequency;
  last = now;

  if (now > expected + fudge) sleep.emit('wake');
}, frequency);

// don't hold up the process
interval.unref();

module.exports = sleep;
},{"./EventEmitter":69}],93:[function(require,module,exports){
(function (Buffer){(function (){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var ValidationError = require('./customError').create('ValidationError');

function isNumeric(value) {
  return !Number.isNaN(parseFloat(value)) && Number.isFinite(value);
}

/**
 * Exported
 */
var validate = module.exports = {};

/**
 * Validates a transport protocol, throws err on invalid input
 * @param {string} str
 */
validate.protocol = function protocol(str) {
  if (typeof str !== 'string') {
    throw new ValidationError('Protocol must be a string, got %s', typeof str === 'undefined' ? 'undefined' : _typeof(str));
  }

  if (str === '' || str !== '_tcp' && str !== '_udp') {
    throw new ValidationError("Protocol must be _tcp or _udp, got '%s'", str);
  }
};

/**
 * Validates a service name, throws err on invalid input
 * @param {string} str
 */
validate.serviceName = function serviceName(str) {
  if (typeof str !== 'string') {
    throw new ValidationError('Service name must be a string, got %s', typeof str === 'undefined' ? 'undefined' : _typeof(str));
  }

  if (!str) {
    throw new ValidationError("Service name can't be an empty string");
  }

  if (!/^_/.test(str)) {
    throw new ValidationError("Service '%s' must start with '_'", str);
  }

  // 15 bytes not including the leading underscore
  if (Buffer.byteLength(str) > 16) {
    throw new ValidationError("Service '%s' is > 15 bytes", str);
  }

  if (!/^_[A-Za-z0-9]/.test(str) || !/[A-Za-z0-9]*$/.test(str)) {
    throw new ValidationError("Service '%s' must start and end with a letter or digit", str);
  }

  if (!/^_[A-Za-z0-9-]+$/.test(str)) {
    throw new ValidationError("Service '%s' should be only letters, digits, and hyphens", str);
  }

  if (/--/.test(str)) {
    throw new ValidationError("Service '%s' must not have consecutive hyphens", str);
  }

  if (!/[A-Za-z]/.test(str)) {
    throw new ValidationError("Service '%s' must have at least 1 letter", str);
  }
};

/**
 * Validates a dns label, throws err on invalid input
 *
 * @param {string} str - label to validate
 * @param {string} [name] - name of the label (for better error messages)
 */
validate.label = function label(str) {
  var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'label';

  if (typeof str !== 'string') {
    throw new ValidationError('%s name must be a string, got %s', name, typeof str === 'undefined' ? 'undefined' : _typeof(str));
  }

  if (!str) {
    throw new ValidationError("%s name can't be an empty string", name);
  }

  if (/[\x00-\x1F]|\x7F/.test(str)) {
    throw new ValidationError("%s name '%s' can't contain control chars", name, str);
  }

  if (Buffer.byteLength(str) > 63) {
    throw new ValidationError('%s must be <= 63 bytes. %s is %d', name, str, Buffer.byteLength(str));
  }
};

/**
 * Validates a port, throws err on invalid input
 *
 * @param {integer} num
 */
validate.port = function port(num) {
  if (!Number.isInteger(num) || num <= 0 || num > 0xFFFF) {
    throw new ValidationError('Port must be an integer between 0 and 65535, got %s', num);
  }
};

/**
 * Validates rdata for a TXT record, throws err on invalid input
 *
 * Example of a valid txt object:
 * {
 *   key: 'value',
 *   buf: Buffer.alloc(123)
 * }
 *
 * @param {object} obj
 */
validate.txt = function txt(obj) {
  var sizeTotal = 0;
  var keys = new Set();

  if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object') {
    throw new ValidationError('TXT must be an object');
  }

  // validate each key value pair
  Object.keys(obj).forEach(function (key) {
    var value = obj[key];
    var size = Buffer.byteLength(key);

    // keys
    if (Buffer.byteLength(key) > 9) {
      throw new ValidationError("Key '%s' in TXT is > 9 chars", key);
    }

    if (!!~key.indexOf('=')) {
      throw new ValidationError("Key '%s' in TXT contains a '='", key);
    }

    if (!/^[ -~]*$/.test(key)) {
      throw new ValidationError("Key '%s' in TXT is not printable ascii", key);
    }

    if (keys.has(key.toLowerCase())) {
      throw new ValidationError("Key '%s' in TXT occurs more than once. (case insensitive)", key);
    }

    keys.add(key.toLowerCase());

    // value type
    if (typeof value !== 'string' && typeof value !== 'boolean' && !isNumeric(value) && !Buffer.isBuffer(value)) {
      throw new ValidationError('TXT values must be a string, buffer, number, or boolean. got %s', typeof value === 'undefined' ? 'undefined' : _typeof(value));
    }

    // size limits
    if (typeof value !== 'boolean') {
      size += Buffer.isBuffer(value) ? value.length : Buffer.byteLength(value.toString());

      // add 1 for the '=' in 'key=value'
      // add 1 for the length byte to be written before 'key=value'
      size += 2;
    }

    sizeTotal += size;

    if (size > 255) {
      throw new ValidationError('Each key/value in TXT must be < 255 bytes');
    }

    if (sizeTotal > 1300) {
      throw new ValidationError('TXT record is > 1300 bytes.');
    }
  });
};
}).call(this)}).call(this,require("buffer").Buffer)
},{"./customError":86,"buffer":5}],94:[function(require,module,exports){

var util = require('./lib/ipputil');

module.exports = {
	parse: require('./lib/parser'),
	serialize: require('./lib/serializer'),
	request: require('./lib/request'),
	Printer: require('./lib/printer'),
	versions: require('./lib/versions'),
	attributes: require('./lib/attributes'),
	keywords: require('./lib/keywords'),
	enums: require('./lib/enums'),
	tags: require('./lib/tags'),
	statusCodes: require('./lib/status-codes')
};
module.exports.operations = module.exports.enums['operations-supported'];
module.exports.attribute = {
	//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-7
	groups: util.xref(module.exports.tags.lookup.slice(0x00, 0x0F)),
	//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-8
	values: util.xref(module.exports.tags.lookup.slice(0x10, 0x1F)),
	//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-9
	syntaxes: util.xref(module.exports.tags.lookup.slice(0x20))
}

},{"./lib/attributes":95,"./lib/enums":96,"./lib/ipputil":97,"./lib/keywords":98,"./lib/parser":99,"./lib/printer":100,"./lib/request":101,"./lib/serializer":102,"./lib/status-codes":103,"./lib/tags":104,"./lib/versions":105}],95:[function(require,module,exports){

/*

The attributes and their syntaxes are complicated. The functions in this
file serve as syntactic sugar that allow the attribute definitions to remain
close to what you will see in the spec. A bit of processing is done at the end
to convert it to one big object tree. If you want to understand what is going on,
uncomment the console.log() at the end of this file.

 */
var tags = require('./tags');

function text(max){
  if(!max) max = 1023;
  return { type:'text', max: max };
}
function integer(min,max){
  if(max==MAX || max===undefined) max = 2147483647;
  if(min===undefined) min = -2147483648;
  return { type:'integer', tag:tags['integer'], min: min, max: max };
}
function rangeOfInteger(min,max){
  if(max==MAX || max===undefined) max = 2147483647;
  if(min===undefined) min = -2147483648;
  return { type:'rangeOfInteger', tag:tags['rangeOfInteger'], min: min, max: max };
}
function boolean(){
  return { type:'boolean', tag:tags['boolean'] };
}
function charset(){
  return { type:'charset', tag:tags['charset'], max: 63 };
}
function keyword(){
  return { type:'keyword', tag:tags['keyword'], min:1, max:1023 };
}
function naturalLanguage(){
  return { type:'naturalLanguage', tag:tags['naturalLanguage'], max: 63 };
}
function dateTime(){
  return { type:'dateTime', tag:tags['dateTime'] };
}
function mimeMediaType(){
  return { type:'mimeMediaType', tag:tags['mimeMediaType'], max: 255 };
}
function uri(max){
  return { type:'uri', tag:tags['uri'], max: max||1023 };
}
function uriScheme(){
  return { type:'uriScheme', tag:tags['uriScheme'], max: 63 };
}
function enumeration(){
  return { type:'enumeration', tag:tags['enum'] };
}
function resolution(){
  return { type:'resolution', tag:tags['resolution'] };
}
function unknown(){
  return { type:'unknown', tag:tags['unknown'] };
}
function name(max){
  return { type:'name', max: max||1023 };
}
function novalue(){
  return { type:'novalue', tag:tags['no-value'] };
}
function octetString(max){
  return { type:'octetString', tag:tags['octetString'], max: max||1023 };
}

//Some attributes allow alternate value syntaxes.
//I want to keep the look and feel of the code close to
//that of the RFCs. So, this _ (underscore) function is
//used to group alternates and not be intrusive visually.
function _(arg1, arg2, arg3){
  var args = Array.prototype.slice.call(arguments);
  args.lookup = {};
  const deferred = createDeferred(function(){
    args.forEach(function(a,i){
      if(typeof a==="function")
        args[i] = a();
      args.lookup[args[i].type] = args[i];
    });
    args.alts = Object.keys(args.lookup).sort().join();
    return args;
  })
  return args.some(function(a){ return isDeferred(a) }) ? deferred : deferred();
}
const createDeferred = function (deferred) {
	deferred.isDeferred = true;
	return deferred;
}

const isDeferred = function (type) {
	return typeof type === "function" && type.isDeferred
}

// In IPP, "1setOf" just means "Array"... but it must 1 or more items
// In javascript, functions can't start with a number- so let's just use...
function setof(type){
  if(isDeferred(type)){
    return createDeferred(function(){
      type = type();
      type.setof=true;
      return type;
    })
  }
  if(typeof type === "function" &&  !isDeferred(type)){
    type = type();
  }
  type.setof=true;
  return type;
}

// In IPP, a "collection" is an set of name-value
// pairs. In javascript, we call them "Objects".
function collection(group, name){
  if(!arguments.length)
    return { type: "collection", tag:tags.begCollection }

  if(typeof group === "string"){
    return createDeferred(function(){
	      return {
	        type: "collection",
	        tag:tags.begCollection,
	        members: attributes[group][name].members
				}
    });
  }
  var defer = Object.keys(group).some(function(key){
    return isDeferred(group[key])
  })
  const deferred = createDeferred(function(){
    return {
      type: "collection",
      tag:tags.begCollection,
      members: resolve(group)
    }
  })
  return defer? deferred : deferred();
}



var MAX = {};

var attributes = {};
attributes["Document Description"] = {
  "attributes-charset":                           charset,
  "attributes-natural-language":                  naturalLanguage,
  "compression":                                  keyword,
  "copies-actual":                                setof(integer(1,MAX)),
  "cover-back-actual":                            setof(collection("Job Template","cover-back")),
  "cover-front-actual":                           setof(collection("Job Template", "cover-front")),
  "current-page-order":                           keyword,
  "date-time-at-completed":                       _(dateTime, novalue),
  "date-time-at-creation":                        dateTime,
  "date-time-at-processing":                      _(dateTime, novalue),
  "detailed-status-messages":                     setof(text),
  "document-access-errors":                       setof(text),
  "document-charset":                             charset,
  "document-digital-signature":                   keyword,
  "document-format":                              mimeMediaType,
  "document-format-details":                      setof(collection("Operation", "document-format-details")),
  "document-format-details-detected":             setof(collection("Operation","document-format-details")),
  "document-format-detected":                     mimeMediaType,
  "document-format-version":                      text(127),
  "document-format-version-detected":             text(127),
  "document-job-id":                              integer(1, MAX),
  "document-job-uri":                             uri,
  "document-message":                             text,
  "document-metadata":                            setof(octetString),
  "document-name":                                name,
  "document-natural-language":                    naturalLanguage,
  "document-number":                              integer(1,MAX),
  "document-printer-uri":                         uri,
  "document-state":                               enumeration,
  "document-state-message":                       text,
  "document-state-reasons":                       setof(keyword),
  "document-uri":                                 uri,
  "document-uuid":                                uri(45),
  "errors-count":                                 integer(0,MAX),
  "finishings-actual":                            setof(enumeration),
  "finishings-col-actual":                        setof(collection("Job Template","finishings-col")),
  "force-front-side-actual":                      setof(integer(1,MAX)),
  "imposition-template-actual":                   setof(_(keyword, name)),
  "impressions":                                  integer(0,MAX),
  "impressions-completed":                        integer(0,MAX),
  "impressions-completed-current-copy":           integer(0,MAX),
  "insert-sheet-actual":                          setof(collection("Job Template","insert-sheet")),
  "k-octets":                                     integer(0,MAX),
  "k-octets-processed":                           integer(0,MAX),
  "last-document":                                boolean,
  "media-actual":                                 setof(_(keyword, name)),
  "media-col-actual":                             setof(collection("Job Template","media-col")),
  "media-input-tray-check-actual":                setof(_(keyword, name)),
  "media-sheets":                                 integer(0,MAX),
  "media-sheets-completed":                       integer(0,MAX),
  "more-info":                                    uri,
  "number-up-actual":                             setof(integer),
  "orientation-requested-actual":                 setof(enumeration),
  "output-bin-actual":                            setof(name),
  "output-device-assigned":                       name(127),
  "overrides-actual":                             setof(collection("Document Template","overrides")),
  "page-delivery-actual":                         setof(keyword),
  "page-order-received-actual":                   setof(keyword),
  "page-ranges-actual":                           setof(rangeOfInteger(1,MAX)),
  "pages":                                        integer(0,MAX),
  "pages-completed":                              integer(0,MAX),
  "pages-completed-current-copy":                 integer(0,MAX),
  "presentation-direction-number-up-actual":      setof(keyword),
  "print-content-optimize-actual":                setof(keyword),
  "print-quality-actual":                         setof(enumeration),
  "printer-resolution-actual":                    setof(resolution),
  "printer-up-time":                              integer(1,MAX),
  "separator-sheets-actual":                      setof(collection("Job Template","separator-sheets")),
  "sheet-completed-copy-number":                  integer(0,MAX),
  "sides-actual":                                 setof(keyword),
  "time-at-completed":                            _(integer, novalue),
  "time-at-creation":                             integer,
  "time-at-processing":                           _(integer, novalue),
  "x-image-position-actual":                      setof(keyword),
  "x-image-shift-actual":                         setof(integer),
  "x-side1-image-shift-actual":                   setof(integer),
  "x-side2-image-shift-actual":                   setof(integer),
  "y-image-position-actual":                      setof(keyword),
  "y-image-shift-actual":                         setof(integer),
  "y-side1-image-shift-actual":                   setof(integer),
  "y-side2-image-shift-actual":                   setof(integer)
};
attributes["Document Template"] = {
	"copies":                                       integer(1,MAX),
  "cover-back":                                   collection("Job Template","cover-back"),
  "cover-front":                                  collection("Job Template","cover-front"),
  "feed-orientation":                             keyword,
  "finishings":                                   setof(enumeration),
  "finishings-col":                               collection("Job Template","finishings-col"),
  "font-name-requested":                          name,
  "font-size-requested":                          integer(1,MAX),
  "force-front-side":                             setof(integer(1,MAX)),
  "imposition-template":                          _(keyword, name),
  "insert-sheet":                                 setof(collection("Job Template","insert-sheet")),
  "media":                                        _(keyword, name),
  "media-col":                                    collection("Job Template","media-col"),
  "media-input-tray-check":                       _(keyword, name),
  "number-up":                                    integer(1,MAX),
  "orientation-requested":                        enumeration,
  "overrides":                                    setof(collection({
    //Any Document Template attribute (TODO)
		"document-copies":                            setof(rangeOfInteger),
    "document-numbers":                           setof(rangeOfInteger),
    "pages":                                      setof(rangeOfInteger)
  })),
	"page-delivery":                                keyword,
  "page-order-received":                          keyword,
  "page-ranges":                                  setof(rangeOfInteger(1,MAX)),
  "pdl-init-file":                                setof(collection("Job Template","pdl-init-file")),
  "presentation-direction-number-up":             keyword,
  "print-color-mode":                             keyword,
  "print-content-optimize":                       keyword,
  "print-quality":                                enumeration,
  "print-rendering-intent":                       keyword,
  "printer-resolution":                           resolution,
  "separator-sheets":                             collection("Job Template","separator-sheets"),
  "sheet-collate":                                keyword,
  "sides":                                        keyword,
  "x-image-position":                             keyword,
  "x-image-shift":                                integer,
  "x-side1-image-shift":                          integer,
  "x-side2-image-shift":                          integer,
  "y-image-position":                             keyword,
  "y-image-shift":                                integer,
  "y-side1-image-shift":                          integer,
  "y-side2-image-shift":                          integer
};
attributes["Event Notifications"] = {
	"notify-subscribed-event":                      keyword,
  "notify-text":                                  text
};
attributes["Job Description"] = {
	"attributes-charset":                           charset,
  "attributes-natural-language":                  naturalLanguage,
  "compression-supplied":                         keyword,
  "copies-actual":                                setof(integer(1,MAX)),
  "cover-back-actual":                            setof(collection("Job Template","cover-back")),
  "cover-front-actual":                           setof(collection("Job Template","cover-front")),
  "current-page-order":                           keyword,
  "date-time-at-completed":                       _(dateTime, novalue),
  "date-time-at-creation":                        dateTime,
  "date-time-at-processing":                      _(dateTime, novalue),
  "document-charset-supplied":                    charset,
  "document-digital-signature-supplied":          keyword,
  "document-format-details-supplied":             setof(collection("Operation","document-format-details")),
  "document-format-supplied":                     mimeMediaType,
  "document-format-version-supplied":             text(127),
  "document-message-supplied":                    text,
  "document-metadata":                            setof(octetString),
  "document-name-supplied":                       name,
  "document-natural-language-supplied":           naturalLanguage,
  "document-overrides-actual":                    setof(collection),
  "errors-count":                                 integer(0,MAX),
  "finishings-actual":                            setof(enumeration),
  "finishings-col-actual":                        setof(collection("Job Template","finishings-col")),
  "force-front-side-actual":                      setof(setof(integer(1, MAX))),
  "imposition-template-actual":                   setof(_(keyword, name)),
  "impressions-completed-current-copy":           integer(0,MAX),
  "insert-sheet-actual":                          setof(collection("Job Template","insert-sheet")),
  "job-account-id-actual":                        setof(name),
  "job-accounting-sheets-actual":                 setof(collection("Job Template","job-accounting-sheets")),
  "job-accounting-user-id-actual":                setof(name),
  "job-attribute-fidelity":                       boolean,
  "job-collation-type":                           enumeration,
  "job-collation-type-actual":                    setof(keyword),
  "job-copies-actual":                            setof(integer(1,MAX)),
  "job-cover-back-actual":                        setof(collection("Job Template","cover-back")),
  "job-cover-front-actual":                       setof(collection("Job Template","cover-front")),
  "job-detailed-status-messages":                 setof(text),
  "job-document-access-errors":                   setof(text),
  "job-error-sheet-actual":                       setof(collection("Job Template","job-error-sheet")),
  "job-finishings-actual":                        setof(enumeration),
  "job-finishings-col-actual":                    setof(collection("Job Template","media-col")),
  "job-hold-until-actual":                        setof(_(keyword, name)),
  "job-id":                                       integer(1,MAX),
  "job-impressions":                              integer(0,MAX),
  "job-impressions-completed":                    integer(0,MAX),
  "job-k-octets":                                 integer(0,MAX),
  "job-k-octets-processed":                       integer(0,MAX),
  "job-mandatory-attributes":                     setof(keyword),
  "job-media-sheets":                             integer(0,MAX),
  "job-media-sheets-completed":                   integer(0,MAX),
  "job-message-from-operator":                    text(127),
  "job-message-to-operator-actual":               setof(text),
  "job-more-info":                                uri,
  "job-name":                                     name,
  "job-originating-user-name":                    name,
  "job-originating-user-uri":                     uri,
  "job-pages":                                    integer(0,MAX),
  "job-pages-completed":                          integer(0,MAX),
  "job-pages-completed-current-copy":             integer(0,MAX),
  "job-printer-up-time":                          integer(1,MAX),
  "job-printer-uri":                              uri,
  "job-priority-actual":                          setof(integer(1,100)),
  "job-save-printer-make-and-model":              text(127),
  "job-sheet-message-actual":                     setof(text),
  "job-sheets-actual":                            setof(_(keyword, name)),
  "job-sheets-col-actual":                        setof(collection("Job Template","job-sheets-col")),
  "job-state":                                    _(enumeration, unknown),
  "job-state-message":                            text,
  "job-state-reasons":                            setof(keyword),
  "job-uri":                                      uri,
  "job-uuid":                                     uri(45),
  "media-actual":                                 setof(_(keyword, name)),
  "media-col-actual":                             setof(collection("Job Template","media-col")),
  "media-input-tray-check-actual":                setof(_(keyword, name)),
  "multiple-document-handling-actual":            setof(keyword),
  "number-of-documents":                          integer(0,MAX),
  "number-of-intervening-jobs":                   integer(0,MAX),
  "number-up-actual":                             setof(integer(1,MAX)),
  "orientation-requested-actual":                 setof(enumeration),
  "original-requesting-user-name":                name,
  "output-bin-actual":                            setof(_(keyword, name)),
  "output-device-actual":                         setof(name(127)),
  "output-device-assigned":                       name(127),
  "overrides-actual":                             setof(collection("Job Template","overrides")),
  "page-delivery-actual":                         setof(keyword),
  "page-order-received-actual":                   setof(keyword),
  "page-ranges-actual":                           setof(rangeOfInteger(1,MAX)),
  "presentation-direction-number-up-actual":      setof(keyword),
  "print-content-optimize-actual":                setof(keyword),
  "print-quality-actual":                         setof(enumeration),
  "printer-resolution-actual":                    setof(resolution),
  "separator-sheets-actual":                      setof(collection("Job Template", "separator-sheets")),
  "sheet-collate-actual":                         setof(keyword),
  "sheet-completed-copy-number":                  integer(0,MAX),
  "sheet-completed-document-number":              integer(0,MAX),
  "sides-actual":                                 setof(keyword),
  "time-at-completed":                            _(integer, novalue),
  "time-at-creation":                             integer,
  "time-at-processing":                           _(integer, novalue),
  "warnings-count":                               integer(0,MAX),
  "x-image-position-actual":                      setof(keyword),
  "x-image-shift-actual":                         setof(integer),
  "x-side1-image-shift-actual":                   setof(integer),
  "x-side2-image-shift-actual":                   setof(integer),
  "y-image-position-actual":                      setof(keyword),
  "y-image-shift-actual":                         setof(integer),
  "y-side1-image-shift-actual":                   setof(integer),
  "y-side2-image-shift-actual":                   setof(integer)
};
attributes["Job Template"] = {
	"copies":                                       integer(1,MAX),
  "cover-back":                                   collection({
    "cover-type":                                 keyword,
    "media":                                      _(keyword, name),
    "media-col":                                  collection("Job Template","media-col")
  }),
	"cover-front":                                  collection({
    "cover-type":                                 keyword,
    "media":                                      _(keyword, name),
    "media-col":                                  collection("Job Template","media-col")
  }),
	"feed-orientation":                             keyword,
  "finishings":                                   setof(enumeration),
  "finishings-col":                               collection({
    "finishing-template":                         name,
    "stitching":                                  collection({
      "stitching-locations":                      setof(integer(0,MAX)),
      "stitching-offset":                         integer(0,MAX),
      "stitching-reference-edge":                 keyword
    })
  }),
	"font-name-requested":                          name,
  "font-size-requested":                          integer(1,MAX),
  "force-front-side":                             setof(integer(1,MAX)),
  "imposition-template":                          _(keyword, name),
  "insert-sheet":                                 setof(collection({
    "insert-after-page-number":                   integer(0,MAX),
    "insert-count":                               integer(0,MAX),
    "media":                                      _(keyword, name),
    "media-col":                                  collection("Job Template","media-col")
  })),
	"job-account-id":                               name,
  "job-accounting-sheets":                        collection({
    "job-accounting-output-bin":                  _(keyword, name),
    "job-accounting-sheets-type":                 _(keyword, name),
    "media":                                      _(keyword, name),
    "media-col":                                  collection("Job Template","media-col")
  }),
	"job-accounting-user-id":                       name,
  "job-copies":                                   integer(1,MAX),
  "job-cover-back":                               collection("Job Template","cover-back"),
  "job-cover-front":                              collection("Job Template","cover-front"),
  "job-delay-output-until":                       _(keyword, name),
  "job-delay-output-until-time":                  dateTime,
  "job-error-action":                             keyword,
  "job-error-sheet":                              collection({
    "job-error-sheet-type":                       _(keyword, name),
    "job-error-sheet-when":                       keyword,
    "media":                                      _(keyword, name),
    "media-col":                                  collection("Job Template","media-col")
  }),
	"job-finishings":                               setof(enumeration),
  "job-finishings-col":                           collection("Job Template","finishings-col"),
  "job-hold-until":                               _(keyword, name),
  "job-hold-until-time":                          dateTime,
  "job-message-to-operator":                      text,
  "job-phone-number":                             uri,
  "job-priority":                                 integer(1,100),
  "job-recipient-name":                           name,
  "job-save-disposition":                         collection({
    "save-disposition":                           keyword,
    "save-info":                                  setof(collection({
      "save-document-format":                     mimeMediaType,
      "save-location":                            uri,
      "save-name":                                name
    }))
  }),
	"job-sheet-message":                            text,
  "job-sheets":                                   _(keyword, name),
  "job-sheets-col":                               collection({
    "job-sheets":                                 _(keyword,name),
    "media":                                      _(keyword,name),
    "media-col":                                  collection("Job Template","media-col")
  }),
	"media":                                        _(keyword,name),
  "media-col":                                    collection({
    "media-back-coating":                         _(keyword,name),
    "media-bottom-margin":                        integer(0,MAX),
    "media-color":                                _(keyword,name),
    "media-front-coating":                        _(keyword,name),
    "media-grain":                                _(keyword,name),
    "media-hole-count":                           integer(0,MAX),
    "media-info":                                 text(255),
    "media-key":                                  _(keyword,name),
    "media-left-margin":                          integer(0,MAX),
    "media-order-count":                          integer(1,MAX),
    "media-pre-printed":                          _(keyword,name),
    "media-recycled":                             _(keyword,name),
    "media-right-margin":                         integer(0,MAX),
    "media-size":                                 collection({
      "x-dimension":                              integer(0,MAX),
      "y-dimension":                              integer(0,MAX),
    }),
		"media-size-name":                            _(keyword,name),
    "media-source":                               _(keyword,name),
    "media-thickness":                            integer(1,MAX),
    "media-tooth":                                _(keyword,name),
    "media-top-margin":                           integer(0,MAX),
    "media-type":                                 _(keyword,name),
    "media-weight-metric":                        integer(0,MAX)
  }),
	"media-input-tray-check":                       _(keyword, name),
  "multiple-document-handling":                   keyword,
  "number-up":                                    integer(1,MAX),
  "orientation-requested":                        enumeration,
  "output-bin":                                   _(keyword, name),
  "output-device":                                name(127),
  "overrides":                                    setof(collection({
    //Any Job Template attribute (TODO)
		"document-copies":                            setof(rangeOfInteger),
    "document-numbers":                           setof(rangeOfInteger),
    "pages":                                      setof(rangeOfInteger)
  })),
	"page-delivery":                                keyword,
  "page-order-received":                          keyword,
  "page-ranges":                                  setof(rangeOfInteger(1,MAX)),
  "pages-per-subset":                             setof(integer(1,MAX)),
  "pdl-init-file":                                collection({
    "pdl-init-file-entry":                        name,
    "pdl-init-file-location":                     uri,
    "pdl-init-file-name":                         name
  }),
	"presentation-direction-number-up":             keyword,
  "print-color-mode":                             keyword,
  "print-content-optimize":                       keyword,
  "print-quality":                                enumeration,
  "print-rendering-intent":                       keyword,
  "printer-resolution":                           resolution,
  "proof-print":                                  collection({
    "media":                                      _(keyword, name),
    "media-col":                                  collection("Job Template", "media-col"),
    "proof-print-copies":                         integer(0,MAX)
  }),
	"separator-sheets":                             collection({
    "media":                                      _(keyword, name),
    "media-col":                                  collection("Job Template", "media-col"),
    "separator-sheets-type":                      setof(keyword)
  }),
	"sheet-collate":                                keyword,
  "sides":                                        keyword,
  "x-image-position":                             keyword,
  "x-image-shift":                                integer,
  "x-side1-image-shift":                          integer,
  "x-side2-image-shift":                          integer,
  "y-image-position":                             keyword,
  "y-image-shift":                                integer,
  "y-side1-image-shift":                          integer,
  "y-side2-image-shift":                          integer
};
attributes["Operation"] = {
	"attributes-charset":                           charset,
  "attributes-natural-language":                  naturalLanguage,
  "compression":                                  keyword,
  "detailed-status-message":                      text,
  "document-access-error":                        text,
  "document-charset":                             charset,
  "document-digital-signature":                   keyword,
  "document-format":                              mimeMediaType,
  "document-format-details":                      setof(collection({
    "document-format":                            mimeMediaType,
    "document-format-device-id":                  text(127),
    "document-format-version":                    text(127),
    "document-natural-language":                  setof(naturalLanguage),
    "document-source-application-name":           name,
    "document-source-application-version":        text(127),
    "document-source-os-name":                    name(40),
    "document-source-os-version":                 text(40)
  })),
	"document-message":                             text,
  "document-metadata":                            setof(octetString),
  "document-name":                                name,
  "document-natural-language":                    naturalLanguage,
  "document-password":                            octetString,
  "document-uri":                                 uri,
  "first-index":                                  integer(1,MAX),
  "identify-actions":                             setof(keyword),
  "ipp-attribute-fidelity":                       boolean,
  "job-hold-until":                               _(keyword, name),
  "job-id":                                       integer(1,MAX),
  "job-ids":                                      setof(integer(1,MAX)),
  "job-impressions":                              integer(0,MAX),
  "job-k-octets":                                 integer(0,MAX),
  "job-mandatory-attributes":                     setof(keyword),
  "job-media-sheets":                             integer(0,MAX),
  "job-message-from-operator":                    text(127),
  "job-name":                                     name,
  "job-password":                                 octetString(255),
  "job-password-encryption":                      _(keyword, name),
  "job-state":                                    enumeration,
  "job-state-message":                            text,
  "job-state-reasons":                            setof(keyword),
  "job-uri":                                      uri,
  "last-document":                                boolean,
  "limit":                                        integer(1,MAX),
  "message":                                      text(127),
  "my-jobs":                                      boolean,
  "original-requesting-user-name":                name,
  "preferred-attributes":                         collection,
  "printer-message-from-operator":                text(127),
  "printer-uri":                                  uri,
  "requested-attributes":                         setof(keyword),
  "requesting-user-name":                         name,
  "requesting-user-uri":                          uri,
  "status-message":                               text(255),
  "which-jobs":                                   keyword
};attributes["Printer Description"] = {
	"charset-configured":                           charset,
  "charset-supported":                            setof(charset),
  "color-supported":                              boolean,
  "compression-supported":                        setof(keyword),
  "copies-default":                               integer(1,MAX),
  "copies-supported":                             rangeOfInteger(1,MAX),
  "cover-back-default":                           collection("Job Template","cover-back"),
  "cover-back-supported":                         setof(keyword),
  "cover-front-default":                          collection("Job Template","cover-front"),
  "cover-front-supported":                        setof(keyword),
  "device-service-count":                         integer(1,MAX),
  "device-uuid":                                  uri(45),
  "document-charset-default":                     charset,
  "document-charset-supported":                   setof(charset),
  "document-creation-attributes-supported":       setof(keyword),
  "document-digital-signature-default":           keyword,
  "document-digital-signature-supported":         setof(keyword),
  "document-format-default":                      mimeMediaType,
  "document-format-details-default":              collection("Operation","document-format-details"),
  "document-format-details-supported":            setof(keyword),
  "document-format-supported":                    setof(mimeMediaType),
  "document-format-varying-attributes":           setof(keyword),
  "document-format-version-default":              text(127),
  "document-format-version-supported":            setof(text(127)),
  "document-natural-language-default":            naturalLanguage,
  "document-natural-language-supported":          setof(naturalLanguage),
  "document-password-supported":                  integer(0,1023),
  "feed-orientation-default":                     keyword,
  "feed-orientation-supported":                   keyword,
  "finishings-col-default":                       collection("Job Template","finishings-col"),
  "finishings-col-ready":                         setof(collection("Job Template","finishings-col")),
  "finishings-col-supported":                     setof(keyword),
  "finishings-default":                           setof(enumeration),
  "finishings-ready":                             setof(enumeration),
  "finishings-supported":                         setof(enumeration),
  "font-name-requested-default":                  name,
  "font-name-requested-supported":                setof(name),
  "font-size-requested-default":                  integer(1,MAX),
  "font-size-requested-supported":                setof(rangeOfInteger(1,MAX)),
  "force-front-side-default (under review)":      setof(integer(1,MAX)),
  "force-front-side-supported (under review)":    rangeOfInteger(1,MAX),
  "generated-natural-language-supported":         setof(naturalLanguage),
  "identify-actions-default":                     setof(keyword),
  "identify-actions-supported":                   setof(keyword),
  "imposition-template-default":                  _(keyword, name),
  "imposition-template-supported":                setof(_(keyword, name)),
  "insert-after-page-number-supported":           rangeOfInteger(0,MAX),
  "insert-count-supported":                       rangeOfInteger(0,MAX),
  "insert-sheet-default":                         setof(collection("Job Template","insert-sheet")),
  "insert-sheet-supported":                       setof(keyword),
  "ipp-features-supported":                       setof(keyword),
  "ipp-versions-supported":                       setof(keyword),
  "ippget-event-life":                            integer(15,MAX),
  "job-account-id-default":                       _(name, novalue),
  "job-account-id-supported":                     boolean,
  "job-accounting-sheets-default":                _(collection("Job Template", "job-accounting-sheets"), novalue),
  "job-accounting-sheets-supported":              setof(keyword),
  "job-accounting-user-id-default":               _(name, novalue),
  "job-accounting-user-id-supported":             boolean,
  "job-constraints-supported":                    setof(collection),
  "job-copies-default":                           integer(1,MAX),
  "job-copies-supported":                         rangeOfInteger(1,MAX),
  "job-cover-back-default":                       collection("Job Template","cover-back"),
  "job-cover-back-supported":                     setof(keyword),
  "job-cover-front-default":                      collection("Job Template","cover-front"),
  "job-cover-front-supported":                    setof(keyword),
  "job-creation-attributes-supported":            setof(keyword),
  "job-delay-output-until-default":               _(keyword, name),
  "job-delay-output-until-supported":             setof(_(keyword, name)),
  "job-delay-output-until-time-supported":        rangeOfInteger(0,MAX),
  "job-error-action-default":                     keyword,
  "job-error-action-supported":                   setof(keyword),
  "job-error-sheet-default":                      _(collection("Job Template", "job-error-sheet"), novalue),
  "job-error-sheet-supported":                    setof(keyword),
  "job-finishings-col-default":                   collection("Job Template","finishings-col"),
  "job-finishings-col-ready":                     setof(collection("Job Template","finishings-col")),
  "job-finishings-col-supported":                 setof(keyword),
  "job-finishings-default":                       setof(enumeration),
  "job-finishings-ready":                         setof(enumeration),
  "job-finishings-supported":                     setof(enumeration),
  "job-hold-until-default":                       _(keyword, name),
  "job-hold-until-supported":                     setof(_(keyword, name)),
  "job-hold-until-time-supported":                rangeOfInteger(0,MAX),
  "job-ids-supported":                            boolean,
  "job-impressions-supported":                    rangeOfInteger(0,MAX),
  "job-k-octets-supported":                       rangeOfInteger(0,MAX),
  "job-media-sheets-supported":                   rangeOfInteger(0,MAX),
  "job-message-to-operator-default":              text,
  "job-message-to-operator-supported":            boolean,
  "job-password-encryption-supported":            setof(_(keyword, name)),
  "job-password-supported":                       integer(0,255),
  "job-phone-number-default":                     _(uri, novalue),
  "job-phone-number-supported":                   boolean,
  "job-priority-default":                         integer(1,100),
  "job-priority-supported":                       integer(1,100),
  "job-recipient-name-default":                   _(name, novalue),
  "job-recipient-name-supported":                 boolean,
  "job-resolvers-supported":                      setof(collection({
    "resolver-name":                              name
  })),
	"job-settable-attributes-supported":            setof(keyword),
  "job-sheet-message-default":                    text,
  "job-sheet-message-supported":                  boolean,
  "job-sheets-col-default":                       collection("Job Template","job-sheets-col"),
  "job-sheets-col-supported":                     setof(keyword),
  "job-sheets-default":                           _(keyword, name),
  "job-sheets-supported":                         setof(_(keyword, name)),
  "job-spooling-supported":                       keyword,
  "max-save-info-supported":                      integer(1,MAX),
  "max-stitching-locations-supported":            integer(1,MAX),
  "media-back-coating-supported":                 setof(_(keyword, name)),
  "media-bottom-margin-supported":                setof(integer(0,MAX)),
  "media-col-database":                           setof(collection({
    //TODO: Member attributes are the same as the
		// "media-col" Job Template attribute
		"media-source-properties":                    collection({
      "media-source-feed-direction":              keyword,
      "media-source-feed-orientation":            enumeration
    })
  })),
	"media-col-default":                            collection("Job Template","media-col"),
  "media-col-ready":                              setof(collection({
    //TODO: Member attributes are the same as the
		// "media-col" Job Template attribute
		"media-source-properties":                    collection({
      "media-source-feed-direction":              keyword,
      "media-source-feed-orientation":            enumeration
    })
  })),
	"media-col-supported":                          setof(keyword),
  "media-color-supported":                        setof(_(keyword, name)),
  "media-default":                                _(keyword, name, novalue),
  "media-front-coating-supported":                setof(_(keyword, name)),
  "media-grain-supported":                        setof(_(keyword, name)),
  "media-hole-count-supported":                   setof(rangeOfInteger(0,MAX)),
  "media-info-supported":                         boolean,
  "media-input-tray-check-default":               _(keyword, name, novalue),
  "media-input-tray-check-supported":             setof(_(keyword, name)),
  "media-key-supported":                          setof(_(keyword, name)),
  "media-left-margin-supported":                  setof(integer(0,MAX)),
  "media-order-count-supported":                  setof(rangeOfInteger(1,MAX)),
  "media-pre-printed-supported":                  setof(_(keyword, name)),
  "media-ready":                                  setof(_(keyword, name)),
  "media-recycled-supported":                     setof(_(keyword, name)),
  "media-right-margin-supported":                 setof(integer(0,MAX)),
  "media-size-supported":                         setof(collection({
    "x-dimension":                                _(integer(1,MAX),rangeOfInteger(1,MAX)),
    "y-dimension":                                _(integer(1,MAX),rangeOfInteger(1,MAX))
  })),
	"media-source-supported":                       setof(_(keyword, name)),
  "media-supported":                              setof(_(keyword, name)),
  "media-thickness-supported":                    rangeOfInteger(1,MAX),
  "media-tooth-supported":                        setof(_(keyword, name)),
  "media-top-margin-supported":                   setof(integer(0,MAX)),
  "media-type-supported":                         setof(_(keyword, name)),
  "media-weight-metric-supported":                setof(rangeOfInteger(0,MAX)),
  "multiple-document-handling-default":           keyword,
  "multiple-document-handling-supported":         setof(keyword),
  "multiple-document-jobs-supported":             boolean,
  "multiple-operation-time-out":                  integer(1,MAX),
  "multiple-operation-timeout-action":            keyword,
  "natural-language-configured":                  naturalLanguage,
  "number-up-default":                            integer(1,MAX),
  "number-up-supported":                          _(integer(1,MAX), rangeOfInteger(1,MAX)),
  "operations-supported":                         setof(enumeration),
  "orientation-requested-default":                _(novalue, enumeration),
  "orientation-requested-supported":              setof(enumeration),
  "output-bin-default":                           _(keyword, name),
  "output-bin-supported":                         setof(_(keyword, name)),
  "output-device-supported":                      setof(name(127)),
  "overrides-supported":                          setof(keyword),
  "page-delivery-default":                        keyword,
  "page-delivery-supported":                      setof(keyword),
  "page-order-received-default":                  keyword,
  "page-order-received-supported":                setof(keyword),
  "page-ranges-supported":                        boolean,
  "pages-per-minute":                             integer(0,MAX),
  "pages-per-minute-color":                       integer(0,MAX),
  "pages-per-subset-supported":                   boolean,
  "parent-printers-supported":                    setof(uri),
  "pdl-init-file-default":                        _(collection("Job Template","pdl-init-file"), novalue),
  "pdl-init-file-entry-supported":                setof(name),
  "pdl-init-file-location-supported":             setof(uri),
  "pdl-init-file-name-subdirectory-supported":    boolean,
  "pdl-init-file-name-supported":                 setof(name),
  "pdl-init-file-supported":                      setof(keyword),
  "pdl-override-supported":                       keyword,
  "preferred-attributes-supported":               boolean,
  "presentation-direction-number-up-default":     keyword,
  "presentation-direction-number-up-supported":   setof(keyword),
  "print-color-mode-default":                     keyword,
  "print-color-mode-supported":                   setof(keyword),
  "print-content-optimize-default":               keyword,
  "print-content-optimize-supported":             setof(keyword),
  "print-quality-default":                        enumeration,
  "print-quality-supported":                      setof(enumeration),
  "print-rendering-intent-default":               keyword,
  "print-rendering-intent-supported":             setof(keyword),
  "printer-alert":                                setof(octetString),
  "printer-alert-description":                    setof(text),
  "printer-charge-info":                          text,
  "printer-charge-info-uri":                      uri,
  "printer-current-time":                         dateTime,
  "printer-detailed-status-messages":             setof(text),
  "printer-device-id":                            text(1023),
  "printer-driver-installer":                     uri,
  "printer-geo-location":                         uri,
  "printer-get-attributes-supported":             setof(keyword),
  "printer-icc-profiles":                         setof(collection({
    "xri-authentication":                         name,
    "profile-url":                                uri
  })),
	"printer-icons":                                setof(uri),
  "printer-info":                                 text(127),
  "printer-is-accepting-jobs":                    boolean,
  "printer-location":                             text(127),
  "printer-make-and-model":                       text(127),
  "printer-mandatory-job-attributes":             setof(keyword),
  "printer-message-date-time":                    dateTime,
  "printer-message-from-operator":                text(127),
  "printer-message-time":                         integer,
  "printer-more-info":                            uri,
  "printer-more-info-manufacturer":               uri,
  "printer-name":                                 name(127),
  "printer-organization":                         setof(text),
  "printer-organizational-unit":                  setof(text),
  "printer-resolution-default":                   resolution,
  "printer-resolution-supported":                 resolution,
  "printer-settable-attributes-supported":        setof(keyword),
  "printer-state":                                enumeration,
  "printer-state-change-date-time":               dateTime,
  "printer-state-change-time":                    integer(1,MAX),
  "printer-state-message":                        text,
  "printer-state-reasons":                        setof(keyword),
  "printer-supply":                               setof(octetString),
  "printer-supply-description":                   setof(text),
  "printer-supply-info-uri":                      uri,
  "printer-up-time":                              integer(1,MAX),
  "printer-uri-supported":                        setof(uri),
  "printer-uuid":                                 uri(45),
  "printer-xri-supported":                        setof(collection({
    "xri-authentication":                         keyword,
    "xri-security":                               keyword,
    "xri-uri":                                    uri
  })),
	"proof-print-default":                          _(collection("Job Template", "proof-print"), novalue),
  "proof-print-supported":                        setof(keyword),
  "pwg-raster-document-resolution-supported":     setof(resolution),
  "pwg-raster-document-sheet-back":               keyword,
  "pwg-raster-document-type-supported":           setof(keyword),
  "queued-job-count":                             integer(0,MAX),
  "reference-uri-schemes-supported":              setof(uriScheme),
  "repertoire-supported":                         setof(_(keyword, name)),
  "requesting-user-uri-supported":                boolean,
  "save-disposition-supported":                   setof(keyword),
  "save-document-format-default":                 mimeMediaType,
  "save-document-format-supported":               setof(mimeMediaType),
  "save-location-default":                        uri,
  "save-location-supported":                      setof(uri),
  "save-name-subdirectory-supported":             boolean,
  "save-name-supported":                          boolean,
  "separator-sheets-default":                     collection("Job Template","separator-sheets"),
  "separator-sheets-supported":                   setof(keyword),
  "sheet-collate-default":                        keyword,
  "sheet-collate-supported":                      setof(keyword),
  "sides-default":                                keyword,
  "sides-supported":                              setof(keyword),
  "stitching-locations-supported":                setof(_(integer(0,MAX), rangeOfInteger(0,MAX))),
  "stitching-offset-supported":                   setof(_(integer(0,MAX), rangeOfInteger(0,MAX))),
  "subordinate-printers-supported":               setof(uri),
  "uri-authentication-supported":                 setof(keyword),
  "uri-security-supported":                       setof(keyword),
  "user-defined-values-supported":                setof(keyword),
  "which-jobs-supported":                         setof(keyword),
  "x-image-position-default":                     keyword,
  "x-image-position-supported":                   setof(keyword),
  "x-image-shift-default":                        integer,
  "x-image-shift-supported":                      rangeOfInteger,
  "x-side1-image-shift-default":                  integer,
  "x-side1-image-shift-supported":                rangeOfInteger,
  "x-side2-image-shift-default":                  integer,
  "x-side2-image-shift-supported":                rangeOfInteger,
  "xri-authentication-supported":                 setof(keyword),
  "xri-security-supported":                       setof(keyword),
  "xri-uri-scheme-supported":                     setof(uriScheme),
  "y-image-position-default":                     keyword,
  "y-image-position-supported":                   setof(keyword),
  "y-image-shift-default":                        integer,
  "y-image-shift-supported":                      rangeOfInteger,
  "y-side1-image-shift-default":                  integer,
  "y-side1-image-shift-supported":                rangeOfInteger,
  "y-side2-image-shift-default":                  integer,
  "y-side2-image-shift-supported":                rangeOfInteger
};
attributes["Subscription Description"] = {
	"notify-job-id":                                integer(1,MAX),
  "notify-lease-expiration-time":                 integer(0,MAX),
  "notify-printer-up-time":                       integer(1,MAX),
  "notify-printer-uri":                           uri,
  "notify-sequence-number":                       integer(0,MAX),
  "notify-subscriber-user-name":                  name,
  "notify-subscriber-user-uri":                   uri,
  "notify-subscription-id":                       integer(1,MAX),
  "subscription-uuid":                            uri
};
attributes["Subscription Template"] = {
	"notify-attributes":                            setof(keyword),
  "notify-attributes-supported":                  setof(keyword),
  "notify-charset":                               charset,
  "notify-events":                                setof(keyword),
  "notify-events-default":                        setof(keyword),
  "notify-events-supported":                      setof(keyword),
  "notify-lease-duration":                        integer(0,67108863),
  "notify-lease-duration-default":                integer(0,67108863),
  "notify-lease-duration-supported":              setof(_(integer(0, 67108863), rangeOfInteger(0, 67108863))),
  "notify-max-events-supported":                  integer(2,MAX),
  "notify-natural-language":                      naturalLanguage,
  "notify-pull-method":                           keyword,
  "notify-pull-method-supported":                 setof(keyword),
  "notify-recipient-uri":                         uri,
  "notify-schemes-supported":                     setof(uriScheme),
  "notify-time-interval":                         integer(0,MAX),
  "notify-user-data":                             octetString(63)
};

//convert all the syntactical sugar to an object tree
function resolve(obj){
  if(obj.type) return obj;
  Object.keys(obj).forEach(function(name){
    var item = obj[name];
    if(typeof item === "function")
      obj[name] = item();
    else if(typeof item === "object" && !item.type)
      obj[name] = resolve(item);
  });
  return obj;
}
resolve(attributes);

module.exports = attributes;
//console.log("var x = ",JSON.stringify(attributes, null, '\t'));

},{"./tags":104}],96:[function(require,module,exports){

var xref = require('./ipputil').xref;
var enums = {
  "document-state": xref([                                            // ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
    ,,,                                                               // 0x00-0x02
    "pending",                                                        // 0x03
    ,                                                                 // 0x04
    "processing",                                                     // 0x05
    ,                                                                 // 0x06
    "canceled",                                                       // 0x07
    "aborted",                                                        // 0x08
    "completed"                                                       // 0x09
  ]),
	"finishings": xref([
	  ,,,                                                               // 0x00 - 0x02
    "none",                                                           // 0x03 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "staple",                                                         // 0x04 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "punch",                                                          // 0x05 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "cover",                                                          // 0x06 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "bind",                                                           // 0x07 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "saddle-stitch",                                                  // 0x08 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "edge-stitch",                                                    // 0x09 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "fold",                                                           // 0x0A http://tools.ietf.org/html/rfc2911#section-4.2.6
    "trim",                                                           // 0x0B ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
    "bale",                                                           // 0x0C ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
    "booklet-maker",                                                  // 0x0D ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
    "jog-offset",                                                     // 0x0E ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
    ,,,,,                                                             // 0x0F - 0x13 reserved for future generic finishing enum values.
    "staple-top-left",                                                // 0x14 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "staple-bottom-left",                                             // 0x15 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "staple-top-right",                                               // 0x16 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "staple-bottom-right",                                            // 0x17 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "edge-stitch-left",                                               // 0x18 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "edge-stitch-top",                                                // 0x19 http://tools.ietf.org/html/rfc2911#section-4.2.6
    "edge-stitch-right",                                              // 0x1A http://tools.ietf.org/html/rfc2911#section-4.2.6
    "edge-stitch-bottom",                                             // 0x1B http://tools.ietf.org/html/rfc2911#section-4.2.6
    "staple-dual-left",                                               // 0x1C http://tools.ietf.org/html/rfc2911#section-4.2.6
    "staple-dual-top",                                                // 0x1D http://tools.ietf.org/html/rfc2911#section-4.2.6
    "staple-dual-right",                                              // 0x1E http://tools.ietf.org/html/rfc2911#section-4.2.6
    "staple-dual-bottom",                                             // 0x1F http://tools.ietf.org/html/rfc2911#section-4.2.6
    ,,,,,,,,,,,,,,,,,,                                                // 0x20 - 0x31 reserved for future specific stapling and stitching enum values.
    "bind-left",                                                      // 0x32 ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
    "bind-top",                                                       // 0x33 ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
    "bind-right",                                                     // 0x34 ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
    "bind-bottom",                                                    // 0x35 ftp://ftp.pwg.org/pub/pwg/ipp/new_VAL/pwg5100.1.pdf
    ,,,,,,                                                            // 0x36 - 0x3B
    "trim-after-pages",                                               // 0x3C ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf (IPP Everywhere)
    "trim-after-documents",                                           // 0x3D ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf (IPP Everywhere)
    "trim-after-copies",                                              // 0x3E ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf (IPP Everywhere)
    "trim-after-job"                                                  // 0x3F ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf (IPP Everywhere)
  ]),
  "operations-supported": xref([
    ,                                                                 // 0x00
    ,                                                                 // 0x01
    "Print-Job",                                                      // 0x02 http://tools.ietf.org/html/rfc2911#section-3.2.1
    "Print-URI",                                                      // 0x03 http://tools.ietf.org/html/rfc2911#section-3.2.2
    "Validate-Job",                                                   // 0x04 http://tools.ietf.org/html/rfc2911#section-3.2.3
    "Create-Job",                                                     // 0x05 http://tools.ietf.org/html/rfc2911#section-3.2.4
    "Send-Document",                                                  // 0x06 http://tools.ietf.org/html/rfc2911#section-3.3.1
    "Send-URI",                                                       // 0x07 http://tools.ietf.org/html/rfc2911#section-3.3.2
    "Cancel-Job",                                                     // 0x08 http://tools.ietf.org/html/rfc2911#section-3.3.3
    "Get-Job-Attributes",                                             // 0x09 http://tools.ietf.org/html/rfc2911#section-3.3.4
    "Get-Jobs",                                                       // 0x0A http://tools.ietf.org/html/rfc2911#section-3.2.6
    "Get-Printer-Attributes",                                         // 0x0B http://tools.ietf.org/html/rfc2911#section-3.2.5
    "Hold-Job",                                                       // 0x0C http://tools.ietf.org/html/rfc2911#section-3.3.5
    "Release-Job",                                                    // 0x0D http://tools.ietf.org/html/rfc2911#section-3.3.6
    "Restart-Job",                                                    // 0x0E http://tools.ietf.org/html/rfc2911#section-3.3.7
    ,                                                                 // 0x0F
    "Pause-Printer",                                                  // 0x10 http://tools.ietf.org/html/rfc2911#section-3.2.7
    "Resume-Printer",                                                 // 0x11 http://tools.ietf.org/html/rfc2911#section-3.2.8
    "Purge-Jobs",                                                     // 0x12 http://tools.ietf.org/html/rfc2911#section-3.2.9
    "Set-Printer-Attributes",                                         // 0x13 IPP2.1 http://tools.ietf.org/html/rfc3380#section-4.1
    "Set-Job-Attributes",                                             // 0x14 IPP2.1 http://tools.ietf.org/html/rfc3380#section-4.2
    "Get-Printer-Supported-Values",                                   // 0x15 IPP2.1 http://tools.ietf.org/html/rfc3380#section-4.3
    "Create-Printer-Subscriptions",                                   // 0x16 IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.1.2
    "Create-Job-Subscription",                                        // 0x17 IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.1.1
    "Get-Subscription-Attributes",                                    // 0x18 IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.2.4
    "Get-Subscriptions",                                              // 0x19 IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.2.5
    "Renew-Subscription",                                             // 0x1A IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.2.6
    "Cancel-Subscription",                                            // 0x1B IPP2.1 http://tools.ietf.org/html/rfc3995#section-7.1 && http://tools.ietf.org/html/rfc3995#section-11.2.7
    "Get-Notifications",                                              // 0x1C IPP2.1 IPP2.1 http://tools.ietf.org/html/rfc3996#section-9.2 && http://tools.ietf.org/html/rfc3996#section-5
    "ipp-indp-method",                                                // 0x1D did not get standardized
    "Get-Resource-Attributes",                                        // 0x1E http://tools.ietf.org/html/draft-ietf-ipp-get-resource-00#section-4.1 did not get standardized
    "Get-Resource-Data",                                              // 0x1F http://tools.ietf.org/html/draft-ietf-ipp-get-resource-00#section-4.2 did not get standardized
    "Get-Resources",                                                  // 0x20 http://tools.ietf.org/html/draft-ietf-ipp-get-resource-00#section-4.3 did not get standardized
    "ipp-install",                                                    // 0x21 did not get standardized
    "Enable-Printer",                                                 // 0x22 http://tools.ietf.org/html/rfc3998#section-3.1.1
    "Disable-Printer",                                                // 0x23 http://tools.ietf.org/html/rfc3998#section-3.1.2
    "Pause-Printer-After-Current-Job",                                // 0x24 http://tools.ietf.org/html/rfc3998#section-3.2.1
    "Hold-New-Jobs",                                                  // 0x25 http://tools.ietf.org/html/rfc3998#section-3.3.1
    "Release-Held-New-Jobs",                                          // 0x26 http://tools.ietf.org/html/rfc3998#section-3.3.2
    "Deactivate-Printer",                                             // 0x27 http://tools.ietf.org/html/rfc3998#section-3.4.1
    "Activate-Printer",                                               // 0x28 http://tools.ietf.org/html/rfc3998#section-3.4.2
    "Restart-Printer",                                                // 0x29 http://tools.ietf.org/html/rfc3998#section-3.5.1
    "Shutdown-Printer",                                               // 0x2A http://tools.ietf.org/html/rfc3998#section-3.5.2
    "Startup-Printer",                                                // 0x2B http://tools.ietf.org/html/rfc3998#section-3.5.3
    "Reprocess-Job",                                                  // 0x2C http://tools.ietf.org/html/rfc3998#section-4.1
    "Cancel-Current-Job",                                             // 0x2D http://tools.ietf.org/html/rfc3998#section-4.2
    "Suspend-Current-Job",                                            // 0x2E http://tools.ietf.org/html/rfc3998#section-4.3.1
    "Resume-Job",                                                     // 0x2F http://tools.ietf.org/html/rfc3998#section-4.3.2
    "Promote-Job",                                                    // 0x30 http://tools.ietf.org/html/rfc3998#section-4.4.1
    "Schedule-Job-After",                                             // 0x31 http://tools.ietf.org/html/rfc3998#section-4.4.2
    ,                                                                 // 0x32
    "Cancel-Document",                                                // 0x33 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
    "Get-Document-Attributes",                                        // 0x34 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
    "Get-Documents",                                                  // 0x35 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
    "Delete-Document",                                                // 0x36 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
    "Set-Document-Attributes",                                        // 0x37 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
    "Cancel-Jobs",                                                    // 0x38 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext10-20101030-5100.11.pdf
    "Cancel-My-Jobs",                                                 // 0x39 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext10-20101030-5100.11.pdf
    "Resubmit-Job",                                                   // 0x3A ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext10-20101030-5100.11.pdf
    "Close-Job",                                                      // 0x3B ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext10-20101030-5100.11.pdf
    "Identify-Printer",                                               // 0x3C ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf
    "Validate-Document"                                               // 0x3D ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf
  ]),
  "job-collation-type": xref([                                        // IPP2.1 http://tools.ietf.org/html/rfc3381#section-6.3
    "other",                                                          // 0x01
    "unknown",                                                        // 0x02
    "uncollated-documents",                                           // 0x03
    'collated-documents',                                             // 0x04
    'uncollated-documents'                                            // 0x05
  ]),
  "job-state": xref([                                                 // http://tools.ietf.org/html/rfc2911#section-4.3.7
    ,,,                                                               // 0x00-0x02
    "pending",                                                        // 0x03
    "pending-held",                                                   // 0x04
    "processing",                                                     // 0x05
    "processing-stopped",                                             // 0x06
    "canceled",                                                       // 0x07
    "aborted",                                                        // 0x08
    "completed"                                                       // 0x09
  ]),
  "orientation-requested": xref([                                     // http://tools.ietf.org/html/rfc2911#section-4.2.10
    ,,,                                                               // 0x00-0x02
    "portrait",                                                       // 0x03
    "landscape",                                                      // 0x04
    "reverse-landscape",                                              // 0x05
    "reverse-portrait",                                               // 0x06
    "none"                                                            // 0x07 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobprinterext3v10-20120727-5100.13.pdf
  ]),
  "print-quality": xref([                                             // http://tools.ietf.org/html/rfc2911#section-4.2.13
    ,,,                                                               // 0x00-0x02
    "draft",                                                          // 0x03
    "normal",                                                         // 0x04
    "high"                                                            // 0x05
  ]),
  "printer-state": xref([                                             // http://tools.ietf.org/html/rfc2911#section-4.4.11
    ,,,                                                               // 0x00-0x02
    "idle",                                                           // 0x03
    "processing",                                                     // 0x04
    "stopped"                                                         // 0x05
  ])
};
enums["finishings-default"] = enums.finishings;
enums["finishings-ready"] = enums.finishings;
enums["finishings-supported"] = enums.finishings;
enums["media-source-feed-orientation"] = enums["orientation-requested"];
enums["orientation-requested-default"] = enums["orientation-requested"];
enums["orientation-requested-supported"] = enums["orientation-requested"];//1setOf
enums["print-quality-default"] = enums["print-quality"];
enums["print-quality-supported"] = enums["print-quality"];//1setOf



module.exports = enums;
},{"./ipputil":97}],97:[function(require,module,exports){


//  To serialize and deserialize, we need to be able to look
//  things up by key or by value. This little helper just
//  converts the arrays to objects and tacks on a 'lookup' property.
function xref(arr){
	var obj = {};
	arr.forEach(function(item, index){
		obj[item] = index;
	});
	obj.lookup = arr;
	return obj;
}

exports.xref = xref;

exports.extend  = function extend(destination, source) {
	for(var property in source) {
		if (source[property] && source[property].constructor === Object) {
			destination[property] = destination[property] || {};
			extend(destination[property], source[property]);
		}
		else {
			destination[property] = source[property];
		}
	}
	return destination;
};

},{}],98:[function(require,module,exports){

var attributes = require('./attributes');

//the only possible values for the keyword
function keyword(arr){
  arr = arr.slice(0);
  arr.type = "keyword";
  return arr;
}
//some values for the keyword- but can include other 'name's
function keyword_name(arr){
  arr = arr.slice(0);
  arr.type = "keyword | name";
  return arr;
}
//a keyword, name, or empty value
function keyword_name_novalue(arr){
  arr = arr.slice(0);
  arr.type = "keyword | name | no-value";
  return arr;
}
//a keyword that groups another keyword's values together
function setof_keyword(arr){
  arr = arr.slice(0);
  arr.type = "1setOf keyword";
  return arr;
}
//a keyword that groups [another keyword's values] or [names] together
function setof_keyword_name(arr){
  arr = arr.slice(0);
  arr.type = "1setOf keyword | name";
  return arr;
}

//media is different from the others because it has sub-groups
var media = {
  "size name": [
    "a",
    "arch-a",
    "arch-b",
    "arch-c",
    "arch-d",
    "arch-e",
    "asme_f_28x40in",
    "b",
    "c",
    "choice_iso_a4_210x297mm_na_letter_8.5x11in",
    "d",
    "e",
    "executive",
    "f",
    "folio",
    "invoice",
    "iso-a0",
    "iso-a1",
    "iso-a2",
    "iso-a3",
    "iso-a4",
    "iso-a5",
    "iso-a6",
    "iso-a7",
    "iso-a8",
    "iso-a9",
    "iso-a10",
    "iso-b0",
    "iso-b1",
    "iso-b2",
    "iso-b3",
    "iso-b4",
    "iso-b5",
    "iso-b6",
    "iso-b7",
    "iso-b8",
    "iso-b9",
    "iso-b10",
    "iso-c3",
    "iso-c4",
    "iso-c5",
    "iso-c6",
    "iso-designated-long",
    "iso_2a0_1189x1682mm",
    "iso_a0_841x1189mm",
    "iso_a1_594x841mm",
    "iso_a1x3_841x1783mm",
    "iso_a1x4_841x2378mm",
    "iso_a2_420x594mm",
    "iso_a2x3_594x1261mm",
    "iso_a2x4_594x1682mm",
    "iso_a2x5_594x2102mm",
    "iso_a3-extra_322x445mm",
    "iso_a3_297x420mm",
    "iso_a0x3_1189x2523mm",
    "iso_a3x3_420x891mm",
    "iso_a3x4_420x1189mm",
    "iso_a3x5_420x1486mm",
    "iso_a3x6_420x1783mm",
    "iso_a3x7_420x2080mm",
    "iso_a4-extra_235.5x322.3mm",
    "iso_a4-tab_225x297mm",
    "iso_a4_210x297mm",
    "iso_a4x3_297x630mm",
    "iso_a4x4_297x841mm",
    "iso_a4x5_297x1051mm",
    "iso_a4x6_297x1261mm",
    "iso_a4x7_297x1471mm",
    "iso_a4x8_297x1682mm",
    "iso_a4x9_297x1892mm",
    "iso_a5-extra_174x235mm",
    "iso_a5_148x210mm",
    "iso_a6_105x148mm",
    "iso_a7_74x105mm",
    "iso_a8_52x74mm",
    "iso_a9_37x52mm",
    "iso_a10_26x37mm",
    "iso_b0_1000x1414mm",
    "iso_b1_707x1000mm",
    "iso_b2_500x707mm",
    "iso_b3_353x500mm",
    "iso_b4_250x353mm",
    "iso_b5-extra_201x276mm",
    "iso_b5_176x250mm",
    "iso_b6_125x176mm",
    "iso_b6c4_125x324mm",
    "iso_b7_88x125mm",
    "iso_b8_62x88mm",
    "iso_b9_44x62mm",
    "iso_b10_31x44mm",
    "iso_c0_917x1297mm",
    "iso_c1_648x917mm",
    "iso_c2_458x648mm",
    "iso_c3_324x458mm",
    "iso_c4_229x324mm",
    "iso_c5_162x229mm",
    "iso_c6_114x162mm",
    "iso_c6c5_114x229mm",
    "iso_c7_81x114mm",
    "iso_c7c6_81x162mm",
    "iso_c8_57x81mm",
    "iso_c9_40x57mm",
    "iso_c10_28x40mm",
    "iso_dl_110x220mm",
    "iso_ra0_860x1220mm",
    "iso_ra1_610x860mm",
    "iso_ra2_430x610mm",
    "iso_sra0_900x1280mm",
    "iso_sra1_640x900mm",
    "iso_sra2_450x640mm",
    "jis-b0",
    "jis-b1",
    "jis-b2",
    "jis-b3",
    "jis-b4",
    "jis-b5",
    "jis-b6",
    "jis-b7",
    "jis-b8",
    "jis-b9",
    "jis-b10",
    "jis_b0_1030x1456mm",
    "jis_b1_728x1030mm",
    "jis_b2_515x728mm",
    "jis_b3_364x515mm",
    "jis_b4_257x364mm",
    "jis_b5_182x257mm",
    "jis_b6_128x182mm",
    "jis_b7_91x128mm",
    "jis_b8_64x91mm",
    "jis_b9_45x64mm",
    "jis_b10_32x45mm",
    "jis_exec_216x330mm",
    "jpn_chou2_111.1x146mm",
    "jpn_chou3_120x235mm",
    "jpn_chou4_90x205mm",
    "jpn_hagaki_100x148mm",
    "jpn_kahu_240x322.1mm",
    "jpn_kaku2_240x332mm",
    "jpn_oufuku_148x200mm",
    "jpn_you4_105x235mm",
    "ledger",
    "monarch",
    "na-5x7",
    "na-6x9",
    "na-7x9",
    "na-8x10",
    "na-9x11",
    "na-9x12",
    "na-10x13",
    "na-10x14",
    "na-10x15",
    "na-legal",
    "na-letter",
    "na-number-9",
    "na-number-10",
    "na_5x7_5x7in",
    "na_6x9_6x9in",
    "na_7x9_7x9in",
    "na_9x11_9x11in",
    "na_10x11_10x11in",
    "na_10x13_10x13in",
    "na_10x14_10x14in",
    "na_10x15_10x15in",
    "na_11x12_11x12in",
    "na_11x15_11x15in",
    "na_12x19_12x19in",
    "na_a2_4.375x5.75in",
    "na_arch-a_9x12in",
    "na_arch-b_12x18in",
    "na_arch-c_18x24in",
    "na_arch-d_24x36in",
    "na_arch-e_36x48in",
    "na_b-plus_12x19.17in",
    "na_c5_6.5x9.5in",
    "na_c_17x22in",
    "na_d_22x34in",
    "na_e_34x44in",
    "na_edp_11x14in",
    "na_eur-edp_12x14in",
    "na_executive_7.25x10.5in",
    "na_f_44x68in",
    "na_fanfold-eur_8.5x12in",
    "na_fanfold-us_11x14.875in",
    "na_foolscap_8.5x13in",
    "na_govt-legal_8x13in",
    "na_govt-letter_8x10in",
    "na_index-3x5_3x5in",
    "na_index-4x6-ext_6x8in",
    "na_index-4x6_4x6in",
    "na_index-5x8_5x8in",
    "na_invoice_5.5x8.5in",
    "na_ledger_11x17in",
    "na_legal-extra_9.5x15in",
    "na_legal_8.5x14in",
    "na_letter-extra_9.5x12in",
    "na_letter-plus_8.5x12.69in",
    "na_letter_8.5x11in",
    "na_monarch_3.875x7.5in",
    "na_number-9_3.875x8.875in",
    "na_number-10_4.125x9.5in",
    "na_number-11_4.5x10.375in",
    "na_number-12_4.75x11in",
    "na_number-14_5x11.5in",
    "na_personal_3.625x6.5in",
    "na_quarto_8.5x10.83in",
    "na_super-a_8.94x14in",
    "na_super-b_13x19in",
    "na_wide-format_30x42in",
    "om_dai-pa-kai_275x395mm",
    "om_folio-sp_215x315mm",
    "om_folio_210x330mm",
    "om_invite_220x220mm",
    "om_italian_110x230mm",
    "om_juuro-ku-kai_198x275mm",
    "om_large-photo_200x300",
    "om_pa-kai_267x389mm",
    "om_postfix_114x229mm",
    "om_small-photo_100x150mm",
    "prc_1_102x165mm",
    "prc_2_102x176mm",
    "prc_3_125x176mm",
    "prc_4_110x208mm",
    "prc_5_110x220mm",
    "prc_6_120x320mm",
    "prc_7_160x230mm",
    "prc_8_120x309mm",
    "prc_10_324x458mm",
    "prc_16k_146x215mm",
    "prc_32k_97x151mm",
    "quarto",
    "roc_8k_10.75x15.5in",
    "roc_16k_7.75x10.75in",
    "super-b",
    "tabloid"
  ],
  "media name": [
    "a-translucent",
    "a-transparent",
    "a-white",
    "arch-a-translucent",
    "arch-a-transparent",
    "arch-a-white",
    "arch-axsynchro-translucent",
    "arch-axsynchro-transparent",
    "arch-axsynchro-white",
    "arch-b-translucent",
    "arch-b-transparent",
    "arch-b-white",
    "arch-bxsynchro-translucent",
    "arch-bxsynchro-transparent",
    "arch-bxsynchro-white",
    "arch-c-translucent",
    "arch-c-transparent",
    "arch-c-white",
    "arch-cxsynchro-translucent",
    "arch-cxsynchro-transparent",
    "arch-cxsynchro-white",
    "arch-d-translucent",
    "arch-d-transparent",
    "arch-d-white",
    "arch-dxsynchro-translucent",
    "arch-dxsynchro-transparent",
    "arch-dxsynchro-white",
    "arch-e-translucent",
    "arch-e-transparent",
    "arch-e-white",
    "arch-exsynchro-translucent",
    "arch-exsynchro-transparent",
    "arch-exsynchro-white",
    "auto-fixed-size-translucent",
    "auto-fixed-size-transparent",
    "auto-fixed-size-white",
    "auto-synchro-translucent",
    "auto-synchro-transparent",
    "auto-synchro-white",
    "auto-translucent",
    "auto-transparent",
    "auto-white",
    "axsynchro-translucent",
    "axsynchro-transparent",
    "axsynchro-white",
    "b-translucent",
    "b-transparent",
    "b-white",
    "bxsynchro-translucent",
    "bxsynchro-transparent",
    "bxsynchro-white",
    "c-translucent",
    "c-transparent",
    "c-white",
    "custom1",
    "custom2",
    "custom3",
    "custom4",
    "custom5",
    "custom6",
    "custom7",
    "custom8",
    "custom9",
    "custom10",
    "cxsynchro-translucent",
    "cxsynchro-transparent",
    "cxsynchro-white",
    "d-translucent",
    "d-transparent",
    "d-white",
    "default",
    "dxsynchro-translucent",
    "dxsynchro-transparent",
    "dxsynchro-white",
    "e-translucent",
    "e-transparent",
    "e-white",
    "executive-white",
    "exsynchro-translucent",
    "exsynchro-transparent",
    "exsynchro-white",
    "folio-white",
    "invoice-white",
    "iso-a0-translucent",
    "iso-a0-transparent",
    "iso-a0-white",
    "iso-a0xsynchro-translucent",
    "iso-a0xsynchro-transparent",
    "iso-a0xsynchro-white",
    "iso-a1-translucent",
    "iso-a1-transparent",
    "iso-a1-white",
    "iso-a1x3-translucent",
    "iso-a1x3-transparent",
    "iso-a1x3-white",
    "iso-a1x4- translucent",
    "iso-a1x4-transparent",
    "iso-a1x4-white",
    "iso-a1xsynchro-translucent",
    "iso-a1xsynchro-transparent",
    "iso-a1xsynchro-white",
    "iso-a2-translucent",
    "iso-a2-transparent",
    "iso-a2-white",
    "iso-a2x3-translucent",
    "iso-a2x3-transparent",
    "iso-a2x3-white",
    "iso-a2x4-translucent",
    "iso-a2x4-transparent",
    "iso-a2x4-white",
    "iso-a2x5-translucent",
    "iso-a2x5-transparent",
    "iso-a2x5-white",
    "iso-a2xsynchro-translucent",
    "iso-a2xsynchro-transparent",
    "iso-a2xsynchro-white",
    "iso-a3-colored",
    "iso-a3-translucent",
    "iso-a3-transparent",
    "iso-a3-white",
    "iso-a3x3-translucent",
    "iso-a3x3-transparent",
    "iso-a3x3-white",
    "iso-a3x4-translucent",
    "iso-a3x4-transparent",
    "iso-a3x4-white",
    "iso-a3x5-translucent",
    "iso-a3x5-transparent",
    "iso-a3x5-white",
    "iso-a3x6-translucent",
    "iso-a3x6-transparent",
    "iso-a3x6-white",
    "iso-a3x7-translucent",
    "iso-a3x7-transparent",
    "iso-a3x7-white",
    "iso-a3xsynchro-translucent",
    "iso-a3xsynchro-transparent",
    "iso-a3xsynchro-white",
    "iso-a4-colored",
    "iso-a4-translucent",
    "iso-a4-transparent",
    "iso-a4-white",
    "iso-a4x3-translucent",
    "iso-a4x3-transparent",
    "iso-a4x3-white",
    "iso-a4x4-translucent",
    "iso-a4x4-transparent",
    "iso-a4x4-white",
    "iso-a4x5-translucent",
    "iso-a4x5-transparent",
    "iso-a4x5-white",
    "iso-a4x6-translucent",
    "iso-a4x6-transparent",
    "iso-a4x6-white",
    "iso-a4x7-translucent",
    "iso-a4x7-transparent",
    "iso-a4x7-white",
    "iso-a4x8-translucent",
    "iso-a4x8-transparent",
    "iso-a4x8-white",
    "iso-a4x9-translucent",
    "iso-a4x9-transparent",
    "iso-a4x9-white",
    "iso-a4xsynchro-translucent",
    "iso-a4xsynchro-transparent",
    "iso-a4xsynchro-white",
    "iso-a5-colored",
    "iso-a5-translucent",
    "iso-a5-transparent",
    "iso-a5-white",
    "iso-a6-white",
    "iso-a7-white",
    "iso-a8-white",
    "iso-a9-white",
    "iso-a10-white",
    "iso-b0-white",
    "iso-b1-white",
    "iso-b2-white",
    "iso-b3-white",
    "iso-b4-colored",
    "iso-b4-white",
    "iso-b5-colored",
    "iso-b5-white",
    "iso-b6-white",
    "iso-b7-white",
    "iso-b8-white",
    "iso-b9-white",
    "iso-b10-white",
    "jis-b0-translucent",
    "jis-b0-transparent",
    "jis-b0-white",
    "jis-b1-translucent",
    "jis-b1-transparent",
    "jis-b1-white",
    "jis-b2-translucent",
    "jis-b2-transparent",
    "jis-b2-white",
    "jis-b3-translucent",
    "jis-b3-transparent",
    "jis-b3-white",
    "jis-b4-colored",
    "jis-b4-translucent",
    "jis-b4-transparent",
    "jis-b4-white",
    "jis-b5-colored",
    "jis-b5-translucent",
    "jis-b5-transparent",
    "jis-b5-white",
    "jis-b6-white",
    "jis-b7-white",
    "jis-b8-white",
    "jis-b9-white",
    "jis-b10-white",
    "ledger-white",
    "na-legal-colored",
    "na-legal-white",
    "na-letter-colored",
    "na-letter-transparent",
    "na-letter-white",
    "quarto-white"
  ],
  "media type": [
    "bond",
    "heavyweight",
    "labels",
    "letterhead",
    "plain",
    "pre-printed",
    "pre-punched",
    "recycled",
    "transparency"
  ],
  "input tray": [
    "bottom",
    "by-pass-tray",
    "envelope",
    "large-capacity",
    "main",
    "manual",
    "middle",
    "side",
    "top",
    "tray-1",
    "tray-2",
    "tray-3",
    "tray-4",
    "tray-5",
    "tray-6",
    "tray-7",
    "tray-8",
    "tray-9",
    "tray-10"
  ],
  "envelope name": [
    "iso-b4-envelope",
    "iso-b5-envelope",
    "iso-c3-envelope",
    "iso-c4-envelope",
    "iso-c5-envelope",
    "iso-c6-envelope",
    "iso-designated-long-envelope",
    "monarch-envelope",
    "na-6x9-envelope",
    "na-7x9-envelope",
    "na-9x11-envelope",
    "na-9x12-envelope",
    "na-10x13-envelope",
    "na-10x14-envelope",
    "na-10x15-envelope",
    "na-number-9-envelope",
    "na-number-10-envelope"
  ]
}

var Job_Template_attribute_names = Object.keys(attributes["Job Template"]);
var Job_Template_and_Operation_attribute_names = Job_Template_attribute_names.concat(Object.keys(attributes["Operation"]))
var Printer_attribute_names = Object.keys(attributes["Job Template"]).concat(["none"]);
var media_name_or_size = media["media name"].concat(media["size name"]);

var keywords = {};
keywords["compression"] = keyword([
  "compress",
  "deflate",
  "gzip",
  "none"
]);
keywords["compression-supported"] = setof_keyword(
  keywords["compression"]
);
keywords["cover-back-supported"] = setof_keyword([
  "cover-type",
  "media",
  "media-col"
]);
keywords["cover-front-supported"] = setof_keyword(
  keywords["cover-back-supported"]
);
keywords["cover-type"] = keyword([
  "no-cover",
  "print-back",
  "print-both",
  "print-front",
  "print-none"
]);
keywords["document-digital-signature"] = keyword([
  "dss",
  "none",
  "pgp",
  "smime",
  "xmldsig"
]);
keywords["document-digital-signature-default"] = keyword(
  keywords["document-digital-signature"]
);
keywords["document-digital-signature-supported"] = setof_keyword(
  keywords["document-digital-signature"]
);
keywords["document-format-details-supported"] = setof_keyword([
  "document-format",
  "document-format-device-id",
  "document-format-version",
  "document-natural-language",
  "document-source-application-name",
  "document-source-application-version",
  "document-source-os-name",
  "document-source-os-version"
]);
keywords["document-format-varying-attributes"] = setof_keyword(
  //Any Printer attribute keyword name
  Printer_attribute_names
);
keywords["document-state-reasons"] = setof_keyword([
  "aborted-by-system",
  "canceled-at-device",
  "canceled-by-operator",
  "canceled-by-user",
  "completed-successfully",
  "completed-with-errors",
  "completed-with-warnings",
  "compression-error",
  "data-insufficient",
  "digital-signature-did-not-verify",
  "digital-signature-type-not-supported",
  "digital-signature-wait",
  "document-access-error",
  "document-format-error",
  "document-password-error",
  "document-permission-error",
  "document-security-error",
  "document-unprintable-error",
  "errors-detected",
  "incoming",
  "interpreting",
  "none",
  "outgoing",
  "printing",
  "processing-to-stop-point",
  "queued",
  "queued-for-marker",
  "queued-in-device",
  "resources-are-not-ready",
  "resources-are-not-supported",
  "submission-interrupted",
  "transforming",
  "unsupported-compression",
  "unsupported-document-format",
  "warnings-detected"
]);
keywords["feed-orientation"] = keyword([
  "long-edge-first",
  "short-edge-first"
]);
keywords["feed-orientation-supported"] = setof_keyword(
  keywords["feed-orientation"]
);
keywords["finishings-col-supported"] = setof_keyword([
  "finishing-template",
  "stitching"
]);
keywords["identify-actions"] = setof_keyword([
  "display",
  "flash",
  "sound",
  "speak"
]);
keywords["identify-actions-default"] = setof_keyword(
  keywords["identify-actions"]
);
keywords["identify-actions-supported"] = setof_keyword(
  keywords["identify-actions"]
);
keywords["imposition-template"] = keyword_name([
  "none",
  "signature"
]);
keywords["ipp-features-supported"] = setof_keyword([
  "document-object",
  "ipp-everywhere",
  "job-save",
  "none",
  "page-overrides",
  "proof-print",
  "subscription-object"
]);
keywords["ipp-versions-supported"] = setof_keyword([
  "1.0",
  "1.1",
  "2.0",
  "2.1",
  "2.2"
]);
keywords["job-accounting-sheets-type"] = keyword_name([
  "none",
  "standard"
]);
keywords["job-cover-back-supported"] = setof_keyword(
  keywords["cover-back-supported"]
);
keywords["job-cover-front-supported"] = setof_keyword(
  keywords["cover-front-supported"]
);
keywords["job-creation-attributes-supported"] = setof_keyword(
//  Any Job Template attribute
//  Any job creation Operation attribute keyword name
  Job_Template_and_Operation_attribute_names
);
keywords["job-error-action"] = keyword([
  "abort-job",
  "cancel-job",
  "continue-job",
  "suspend-job"
]);
keywords["job-error-action-default"] = keyword(
  keywords["job-error-action"]
);
keywords["job-error-action-supported"] = setof_keyword(
  keywords["job-error-action"]
);
keywords["job-error-sheet-type"] = keyword_name([
  "none",
  "standard"
]);
keywords["job-error-sheet-when"] = keyword([
  "always",
  "on-error"
]);
keywords["job-finishings-col-supported"] = setof_keyword(
  keywords["finishings-col-supported"]
);
keywords["job-hold-until"] = keyword_name([
  "day-time",
  "evening",
  "indefinite",
  "night",
  "no-hold",
  "second-shift",
  "third-shift",
  "weekend"
]);
keywords["job-hold-until-default"] = keyword_name(
  keywords["job-hold-until"]
);
keywords["job-hold-until-supported"] = setof_keyword_name(
  keywords["job-hold-until"]
);
keywords["job-mandatory-attributes"] = setof_keyword(
//  Any Job Template attribute
  Job_Template_attribute_names
);
keywords["job-password-encryption"] = keyword_name([
  "md2",
  "md4",
  "md5",
  "none",
  "sha"
]);
keywords["job-password-encryption-supported"] = setof_keyword_name(
  keywords["job-password-encryption"]
);
keywords["job-save-disposition-supported"] = setof_keyword([
  "save-disposition",
  "save-info"
]);
keywords["job-settable-attributes-supported"] = setof_keyword(
//  Any Job Template attribute
  Job_Template_attribute_names
);
keywords["job-sheets"] = keyword_name([
  "first-print-stream-page",
  "job-both-sheet",
  "job-end-sheet",
  "job-start-sheet",
  "none",
  "standard"
]);
keywords["job-sheets-default"] = keyword_name(
  keywords["job-sheets"]
);
keywords["job-sheets-supported"] = setof_keyword_name(
  keywords["job-sheets"]
);
keywords["job-spooling-supported"] = keyword([
  "automatic",
  "spool",
  "stream"
]);
keywords["job-state-reasons"] = setof_keyword([
  "aborted-by-system",
  "compression-error",
  "digital-signature-did-not-verify",
  "digital-signature-type-not-supported",
  "document-access-error",
  "document-format-error",
  "document-password-error",
  "document-permission-error",
  "document-security-error",
  "document-unprintable-error",
  "errors-detected",
  "job-canceled-at-device",
  "job-canceled-by-operator",
  "job-canceled-by-user",
  "job-completed-successfully",
  "job-completed-with-errors",
  "job-completed-with-warnings",
  "job-data-insufficient",
  "job-delay-output-until-specified",
  "job-digital-signature-wait",
  "job-hold-until-specified",
  "job-incoming",
  "job-interpreting",
  "job-outgoing",
  "job-password-wait",
  "job-printed-successfully",
  "job-printed-with-errors",
  "job-printed-with-warnings",
  "job-printing",
  "job-queued",
  "job-queued-for-marker",
  "job-restartable",
  "job-resuming",
  "job-saved-successfully",
  "job-saved-with-errors",
  "job-saved-with-warnings",
  "job-saving",
  "job-spooling",
  "job-streaming",
  "job-suspended",
  "job-suspended-by-operator",
  "job-suspended-by-system",
  "job-suspended-by-user",
  "job-suspending",
  "job-transforming",
  "none",
  "printer-stopped",
  "printer-stopped-partly",
  "processing-to-stop-point",
  "queued-in-device",
  "resources-are-not-ready",
  "resources-are-not-supported",
  "service-off-line",
  "submission-interrupted",
  "unsupported-compression",
  "unsupported-document-format",
  "warnings-detected"
]);
keywords["media"] = keyword_name(
  [].concat(media["size name"],
    media["media name"],
    media["media type"],
    media["input tray"],
    media["envelope name"]
  )
);
keywords["media-back-coating"] = keyword_name([
  "glossy",
  "high-gloss",
  "matte",
  "none",
  "satin",
  "semi-gloss"
]);
keywords["media-back-coating-supported"] = setof_keyword_name(
  keywords["media-back-coating"]
);
keywords["media-col-supported"] = setof_keyword([
  "media-bottom-margin",
  "media-left-margin",
  "media-right-margin",
  "media-size-name",
  "media-source",
  "media-top-margin"
]);
keywords["media-color"] = keyword_name([
  "blue",
  "buff",
  "goldenrod",
  "gray",
  "green",
  "ivory",
  "no-color",
  "orange",
  "pink",
  "red",
  "white",
  "yellow"
]);
keywords["media-color-supported"] = setof_keyword_name(
  keywords["media-color"]
);
keywords["media-default"] = keyword_name_novalue(
  keywords["media"]
);
keywords["media-front-coating"] = keyword_name(
  keywords["media-back-coating"]
);
keywords["media-front-coating-supported"] = setof_keyword_name(
  keywords["media-back-coating"]
);
keywords["media-grain"] = keyword_name([
  "x-direction",
  "y-direction"
]);
keywords["media-grain-supported"] = setof_keyword_name(
  keywords["media-grain"]
);
keywords["media-input-tray-check"] = keyword_name([
  media["input tray"]
]);
keywords["media-input-tray-check-default"] = keyword_name([
  media["input tray"]
]);
keywords["media-input-tray-check-supported"] = setof_keyword_name(
  media["input tray"]
);
keywords["media-key"] = keyword_name(
//  Any "media" media or size keyword value
  media_name_or_size
);
keywords["media-key-supported"] = setof_keyword_name([
//  Any "media" media or size keyword value
  media_name_or_size
]);
keywords["media-pre-printed"] = keyword_name([
  "blank",
  "letter-head",
  "pre-printed"
]);
keywords["media-pre-printed-supported"] = keyword_name(
  keywords["media-pre-printed"]
);
keywords["media-ready"] = setof_keyword_name([
//  Any "media" media or size keyword value
  media_name_or_size
]);
keywords["media-recycled"] = keyword_name([
  "none",
  "standard"
]);
keywords["media-recycled-supported"] = keyword_name(
  keywords["media-recycled"]
);
keywords["media-source"] = keyword_name([
  "alternate",
  "alternate-roll",
  "auto",
  "bottom",
  "by-pass-tray",
  "center",
  "disc",
  "envelope",
  "hagaki",
  "large-capacity",
  "left",
  "main",
  "main-roll",
  "manual",
  "middle",
  "photo",
  "rear",
  "right",
  "roll-1",
  "roll-2",
  "roll-3",
  "roll-4",
  "roll-5",
  "roll-6",
  "roll-7",
  "roll-8",
  "roll-9",
  "roll-10",
  "side",
  "top",
  "tray-1",
  "tray-2",
  "tray-3",
  "tray-4",
  "tray-5",
  "tray-6",
  "tray-7",
  "tray-8",
  "tray-9",
  "tray-10",
  "tray-11",
  "tray-12",
  "tray-13",
  "tray-14",
  "tray-15",
  "tray-16",
  "tray-17",
  "tray-18",
  "tray-19",
  "tray-20"
]);
keywords["media-source-feed-direction"] = keyword(
  keywords["feed-orientation"]
);
keywords["media-source-supported"] = setof_keyword_name(
  keywords["media-source"]
);
keywords["media-supported"] = setof_keyword_name(
  keywords["media"]
);
keywords["media-tooth"] = keyword_name([
  "antique",
  "calendared",
  "coarse",
  "fine",
  "linen",
  "medium",
  "smooth",
  "stipple",
  "uncalendared",
  "vellum"
]);
keywords["media-tooth-supported"] = setof_keyword_name(
  keywords["media-tooth"]
);
keywords["media-type"] = keyword_name([
  "aluminum",
  "back-print-film",
  "cardboard",
  "cardstock",
  "cd",
  "continuous",
  "continuous-long",
  "continuous-short",
  "corrugated-board",
  "disc",
  "double-wall",
  "dry-film",
  "dvd",
  "embossing-foil",
  "end-board",
  "envelope",
  "envelope-plain",
  "envelope-window",
  "film",
  "flexo-base",
  "flexo-photo-polymer",
  "flute",
  "foil",
  "full-cut-tabs",
  "gravure-cylinder",
  "image-setter-paper",
  "imaging-cylinder",
  "labels",
  "laminating-foil",
  "letterhead",
  "mounting-tape",
  "multi-layer",
  "multi-part-form",
  "other",
  "paper",
  "photographic",
  "photographic-film",
  "photographic-glossy",
  "photographic-high-gloss",
  "photographic-matte",
  "photographic-satin",
  "photographic-semi-gloss",
  "plate",
  "polyester",
  "pre-cut-tabs",
  "roll",
  "screen",
  "screen-paged",
  "self-adhesive",
  "shrink-foil",
  "single-face",
  "single-wall",
  "sleeve",
  "stationery",
  "stationery-coated",
  "stationery-fine",
  "stationery-heavyweight",
  "stationery-inkjet",
  "stationery-letterhead",
  "stationery-lightweight",
  "stationery-preprinted",
  "stationery-prepunched",
  "tab-stock",
  "tractor",
  "transparency",
  "triple-wall",
  "wet-film"
]);
keywords["media-type-supported"] = setof_keyword_name(
  keywords["media-type"]
);
keywords["multiple-document-handling"] = keyword([
  "separate-documents-collated-copies",
  "separate-documents-uncollated-copies",
  "single-document",
  "single-document-new-sheet"
]);
keywords["multiple-document-handling-default"] = keyword(
  keywords["multiple-document-handling"]
);
keywords["multiple-document-handling-supported"] = setof_keyword(
  keywords["multiple-document-handling"]
);
keywords["multiple-operation-timeout-action"] = keyword([
  "abort-job",
  "hold-job",
  "process-job"
]);
keywords["notify-events"] = setof_keyword([
  "job-completed",
  "job-config-changed",
  "job-created",
  "job-progress",
  "job-state-changed",
  "job-stopped",
  "none",
  "printer-config-changed",
  "printer-finishings-changed",
  "printer-media-changed",
  "printer-queue-order-changed",
  "printer-restarted",
  "printer-shutdown",
  "printer-state-changed",
  "printer-stopped"
]);
keywords["notify-events-default"] = setof_keyword(
  keywords["notify-events"]
);
keywords["notify-events-supported"] = setof_keyword(
  keywords["notify-events"]
);
keywords["notify-pull-method"] = keyword([
  "ippget"
]);
keywords["notify-pull-method-supported"] = setof_keyword(
  keywords["notify-pull-method"]
);
keywords["notify-subscribed-event"] = keyword(
  keywords["notify-events"]
);
keywords["output-bin"] = keyword_name([
  "bottom",
  "center",
  "face-down",
  "face-up",
  "large-capacity",
  "left",
  "mailbox-1",
  "mailbox-2",
  "mailbox-3",
  "mailbox-4",
  "mailbox-5",
  "mailbox-6",
  "mailbox-7",
  "mailbox-8",
  "mailbox-9",
  "mailbox-10",
  "middle",
  "my-mailbox",
  "rear",
  "right",
  "side",
  "stacker-1",
  "stacker-2",
  "stacker-3",
  "stacker-4",
  "stacker-5",
  "stacker-6",
  "stacker-7",
  "stacker-8",
  "stacker-9",
  "stacker-10",
  "top",
  "tray-1",
  "tray-2",
  "tray-3",
  "tray-4",
  "tray-5",
  "tray-6",
  "tray-7",
  "tray-8",
  "tray-9",
  "tray-10"
]);
keywords["job-accounting-output-bin"] = keyword_name(
  keywords["output-bin"]
);
keywords["output-bin-default"] = keyword_name(
  keywords["output-bin"]
);
keywords["output-bin-supported"] = setof_keyword_name(
  keywords["output-bin"]
);
keywords["page-delivery"] = keyword([
  "reverse-order-face-down",
  "reverse-order-face-up",
  "same-order-face-down",
  "same-order-face-up",
  "system-specified"
]);
keywords["page-delivery-default"] = keyword(
  keywords["page-delivery"]
);
keywords["page-delivery-supported"] = setof_keyword(
  keywords["page-delivery"]
);
keywords["page-order-received"] = keyword([
  "1-to-n-order",
  "n-to-1-order"
]);
keywords["page-order-received-default"] = keyword(
  keywords["page-order-received"]
);
keywords["page-order-received-supported"] = setof_keyword(
  keywords["page-order-received"]
);
keywords["current-page-order"] = keyword(
  keywords["page-order-received"]
);
keywords["pdl-init-file-supported"] = setof_keyword([
  "pdl-init-file-entry",
  "pdl-init-file-location",
  "pdl-init-file-name"
]);
keywords["pdl-override-supported"] = keyword([
  "attempted",
  "guaranteed",
  "not-attempted"
]);
keywords["presentation-direction-number-up"] = keyword([
  "tobottom-toleft",
  "tobottom-toright",
  "toleft-tobottom",
  "toleft-totop",
  "toright-tobottom",
  "toright-totop",
  "totop-toleft",
  "totop-toright"
]);
keywords["presentation-direction-number-up-default"] = keyword(
  keywords["presentation-direction-number-up"]
);
keywords["presentation-direction-number-up-supported"] = setof_keyword(
  keywords["presentation-direction-number-up"]
);
keywords["print-color-mode"] = keyword([
  "auto",
  "bi-level",
  "color",
  "highlight",
  "monochrome",
  "process-bi-level",
  "process-monochrome"
]);
keywords["print-color-mode-default"] = keyword(
  keywords["print-color-mode"]
);
keywords["print-color-mode-supported"] = setof_keyword(
  keywords["print-color-mode"]
);
keywords["print-content-optimize"] = keyword([
  "auto",
  "graphic",
  "photo",
  "text",
  "text-and-graphic"
]);
keywords["print-content-optimize-default"] = keyword(
  keywords["print-content-optimize"]
);
keywords["print-content-optimize-supported"] = setof_keyword(
  keywords["print-content-optimize"]
);
keywords["print-rendering-intent"] = keyword([
  "absolute",
  "auto",
  "perceptual",
  "relative",
  "relative-bpc",
  "saturation"
]);
keywords["print-rendering-intent-default"] = keyword(
  keywords["print-rendering-intent"]
);
keywords["print-rendering-intent-supported"] = setof_keyword(
  keywords["print-rendering-intent"]
);
keywords["printer-get-attributes-supported"] = setof_keyword(
//  Any Job Template attribute
//  Any job creation Operation attribute keyword name
  Job_Template_and_Operation_attribute_names
);
keywords["printer-mandatory-job-attributes"] = setof_keyword(
//	Any Job Template attribute
//	Any Operation attribute at the job level
  //this probably isn't quite right...
  Job_Template_and_Operation_attribute_names
);
keywords["printer-settable-attributes-supported"] = setof_keyword(
//  Any read-write Printer attribute keyword name
  Printer_attribute_names
);
keywords["printer-state-reasons"] = setof_keyword([
  "alert-removal-of-binary-change-entry",
  "bander-added",
  "bander-almost-empty",
  "bander-almost-full",
  "bander-at-limit",
  "bander-closed",
  "bander-configuration-change",
  "bander-cover-closed",
  "bander-cover-open",
  "bander-empty",
  "bander-full",
  "bander-interlock-closed",
  "bander-interlock-open",
  "bander-jam",
  "bander-life-almost-over",
  "bander-life-over",
  "bander-memory-exhausted",
  "bander-missing",
  "bander-motor-failure",
  "bander-near-limit",
  "bander-offline",
  "bander-opened",
  "bander-over-temperature",
  "bander-power-saver",
  "bander-recoverable-failure",
  "bander-recoverable-storage-error",
  "bander-removed",
  "bander-resource-added",
  "bander-resource-removed",
  "bander-thermistor-failure",
  "bander-timing-failure",
  "bander-turned-off",
  "bander-turned-on",
  "bander-under-temperature",
  "bander-unrecoverable-failure",
  "bander-unrecoverable-storage-error",
  "bander-warming-up",
  "binder-added",
  "binder-almost-empty",
  "binder-almost-full",
  "binder-at-limit",
  "binder-closed",
  "binder-configuration-change",
  "binder-cover-closed",
  "binder-cover-open",
  "binder-empty",
  "binder-full",
  "binder-interlock-closed",
  "binder-interlock-open",
  "binder-jam",
  "binder-life-almost-over",
  "binder-life-over",
  "binder-memory-exhausted",
  "binder-missing",
  "binder-motor-failure",
  "binder-near-limit",
  "binder-offline",
  "binder-opened",
  "binder-over-temperature",
  "binder-power-saver",
  "binder-recoverable-failure",
  "binder-recoverable-storage-error",
  "binder-removed",
  "binder-resource-added",
  "binder-resource-removed",
  "binder-thermistor-failure",
  "binder-timing-failure",
  "binder-turned-off",
  "binder-turned-on",
  "binder-under-temperature",
  "binder-unrecoverable-failure",
  "binder-unrecoverable-storage-error",
  "binder-warming-up",
  "cleaner-life-almost-over",
  "cleaner-life-over",
  "configuration-change",
  "connecting-to-device",
  "cover-open",
  "deactivated",
  "developer-empty",
  "developer-low",
  "die-cutter-added",
  "die-cutter-almost-empty",
  "die-cutter-almost-full",
  "die-cutter-at-limit",
  "die-cutter-closed",
  "die-cutter-configuration-change",
  "die-cutter-cover-closed",
  "die-cutter-cover-open",
  "die-cutter-empty",
  "die-cutter-full",
  "die-cutter-interlock-closed",
  "die-cutter-interlock-open",
  "die-cutter-jam",
  "die-cutter-life-almost-over",
  "die-cutter-life-over",
  "die-cutter-memory-exhausted",
  "die-cutter-missing",
  "die-cutter-motor-failure",
  "die-cutter-near-limit",
  "die-cutter-offline",
  "die-cutter-opened",
  "die-cutter-over-temperature",
  "die-cutter-power-saver",
  "die-cutter-recoverable-failure",
  "die-cutter-recoverable-storage-error",
  "die-cutter-removed",
  "die-cutter-resource-added",
  "die-cutter-resource-removed",
  "die-cutter-thermistor-failure",
  "die-cutter-timing-failure",
  "die-cutter-turned-off",
  "die-cutter-turned-on",
  "die-cutter-under-temperature",
  "die-cutter-unrecoverable-failure",
  "die-cutter-unrecoverable-storage-error",
  "die-cutter-warming-up",
  "door-open",
  "folder-added",
  "folder-almost-empty",
  "folder-almost-full",
  "folder-at-limit",
  "folder-closed",
  "folder-configuration-change",
  "folder-cover-closed",
  "folder-cover-open",
  "folder-empty",
  "folder-full",
  "folder-interlock-closed",
  "folder-interlock-open",
  "folder-jam",
  "folder-life-almost-over",
  "folder-life-over",
  "folder-memory-exhausted",
  "folder-missing",
  "folder-motor-failure",
  "folder-near-limit",
  "folder-offline",
  "folder-opened",
  "folder-over-temperature",
  "folder-power-saver",
  "folder-recoverable-failure",
  "folder-recoverable-storage-error",
  "folder-removed",
  "folder-resource-added",
  "folder-resource-removed",
  "folder-thermistor-failure",
  "folder-timing-failure",
  "folder-turned-off",
  "folder-turned-on",
  "folder-under-temperature",
  "folder-unrecoverable-failure",
  "folder-unrecoverable-storage-error",
  "folder-warming-up",
  "fuser-over-temp",
  "fuser-under-temp",
  "imprinter-added",
  "imprinter-almost-empty",
  "imprinter-almost-full",
  "imprinter-at-limit",
  "imprinter-closed",
  "imprinter-configuration-change",
  "imprinter-cover-closed",
  "imprinter-cover-open",
  "imprinter-empty",
  "imprinter-full",
  "imprinter-interlock-closed",
  "imprinter-interlock-open",
  "imprinter-jam",
  "imprinter-life-almost-over",
  "imprinter-life-over",
  "imprinter-memory-exhausted",
  "imprinter-missing",
  "imprinter-motor-failure",
  "imprinter-near-limit",
  "imprinter-offline",
  "imprinter-opened",
  "imprinter-over-temperature",
  "imprinter-power-saver",
  "imprinter-recoverable-failure",
  "imprinter-recoverable-storage-error",
  "imprinter-removed",
  "imprinter-resource-added",
  "imprinter-resource-removed",
  "imprinter-thermistor-failure",
  "imprinter-timing-failure",
  "imprinter-turned-off",
  "imprinter-turned-on",
  "imprinter-under-temperature",
  "imprinter-unrecoverable-failure",
  "imprinter-unrecoverable-storage-error",
  "imprinter-warming-up",
  "input-cannot-feed-size-selected",
  "input-manual-input-request",
  "input-media-color-change",
  "input-media-form-parts-change",
  "input-media-size-change",
  "input-media-type-change",
  "input-media-weight-change",
  "input-tray-elevation-failure",
  "input-tray-missing",
  "input-tray-position-failure",
  "inserter-added",
  "inserter-almost-empty",
  "inserter-almost-full",
  "inserter-at-limit",
  "inserter-closed",
  "inserter-configuration-change",
  "inserter-cover-closed",
  "inserter-cover-open",
  "inserter-empty",
  "inserter-full",
  "inserter-interlock-closed",
  "inserter-interlock-open",
  "inserter-jam",
  "inserter-life-almost-over",
  "inserter-life-over",
  "inserter-memory-exhausted",
  "inserter-missing",
  "inserter-motor-failure",
  "inserter-near-limit",
  "inserter-offline",
  "inserter-opened",
  "inserter-over-temperature",
  "inserter-power-saver",
  "inserter-recoverable-failure",
  "inserter-recoverable-storage-error",
  "inserter-removed",
  "inserter-resource-added",
  "inserter-resource-removed",
  "inserter-thermistor-failure",
  "inserter-timing-failure",
  "inserter-turned-off",
  "inserter-turned-on",
  "inserter-under-temperature",
  "inserter-unrecoverable-failure",
  "inserter-unrecoverable-storage-error",
  "inserter-warming-up",
  "interlock-closed",
  "interlock-open",
  "interpreter-cartridge-added",
  "interpreter-cartridge-deleted",
  "interpreter-complex-page-encountered",
  "interpreter-memory-decrease",
  "interpreter-memory-increase",
  "interpreter-resource-added",
  "interpreter-resource-deleted",
  "interpreter-resource-unavailable",
  "make-envelope-added",
  "make-envelope-almost-empty",
  "make-envelope-almost-full",
  "make-envelope-at-limit",
  "make-envelope-closed",
  "make-envelope-configuration-change",
  "make-envelope-cover-closed",
  "make-envelope-cover-open",
  "make-envelope-empty",
  "make-envelope-full",
  "make-envelope-interlock-closed",
  "make-envelope-interlock-open",
  "make-envelope-jam",
  "make-envelope-life-almost-over",
  "make-envelope-life-over",
  "make-envelope-memory-exhausted",
  "make-envelope-missing",
  "make-envelope-motor-failure",
  "make-envelope-near-limit",
  "make-envelope-offline",
  "make-envelope-opened",
  "make-envelope-over-temperature",
  "make-envelope-power-saver",
  "make-envelope-recoverable-failure",
  "make-envelope-recoverable-storage-error",
  "make-envelope-removed",
  "make-envelope-resource-added",
  "make-envelope-resource-removed",
  "make-envelope-thermistor-failure",
  "make-envelope-timing-failure",
  "make-envelope-turned-off",
  "make-envelope-turned-on",
  "make-envelope-under-temperature",
  "make-envelope-unrecoverable-failure",
  "make-envelope-unrecoverable-storage-error",
  "make-envelope-warming-up",
  "marker-adjusting-print-quality",
  "marker-developer-almost-empty",
  "marker-developer-empty",
  "marker-fuser-thermistor-failure",
  "marker-fuser-timing-failure",
  "marker-ink-almost-empty",
  "marker-ink-empty",
  "marker-print-ribbon-almost-empty",
  "marker-print-ribbon-empty",
  "marker-supply-empty",
  "marker-supply-low",
  "marker-toner-cartridge-missing",
  "marker-waste-almost-full",
  "marker-waste-full",
  "marker-waste-ink-receptacle-almost-full",
  "marker-waste-ink-receptacle-full",
  "marker-waste-toner-receptacle-almost-full",
  "marker-waste-toner-receptacle-full",
  "media-empty",
  "media-jam",
  "media-low",
  "media-needed",
  "media-path-cannot-duplex-media-selected",
  "media-path-media-tray-almost-full",
  "media-path-media-tray-full",
  "media-path-media-tray-missing",
  "moving-to-paused",
  "none",
  "opc-life-over",
  "opc-near-eol",
  "other",
  "output-area-almost-full",
  "output-area-full",
  "output-mailbox-select-failure",
  "output-tray-missing",
  "paused",
  "perforater-added",
  "perforater-almost-empty",
  "perforater-almost-full",
  "perforater-at-limit",
  "perforater-closed",
  "perforater-configuration-change",
  "perforater-cover-closed",
  "perforater-cover-open",
  "perforater-empty",
  "perforater-full",
  "perforater-interlock-closed",
  "perforater-interlock-open",
  "perforater-jam",
  "perforater-life-almost-over",
  "perforater-life-over",
  "perforater-memory-exhausted",
  "perforater-missing",
  "perforater-motor-failure",
  "perforater-near-limit",
  "perforater-offline",
  "perforater-opened",
  "perforater-over-temperature",
  "perforater-power-saver",
  "perforater-recoverable-failure",
  "perforater-recoverable-storage-error",
  "perforater-removed",
  "perforater-resource-added",
  "perforater-resource-removed",
  "perforater-thermistor-failure",
  "perforater-timing-failure",
  "perforater-turned-off",
  "perforater-turned-on",
  "perforater-under-temperature",
  "perforater-unrecoverable-failure",
  "perforater-unrecoverable-storage-error",
  "perforater-warming-up",
  "power-down",
  "power-up",
  "printer-manual-reset",
  "printer-nms-reset",
  "printer-ready-to-print",
  "puncher-added",
  "puncher-almost-empty",
  "puncher-almost-full",
  "puncher-at-limit",
  "puncher-closed",
  "puncher-configuration-change",
  "puncher-cover-closed",
  "puncher-cover-open",
  "puncher-empty",
  "puncher-full",
  "puncher-interlock-closed",
  "puncher-interlock-open",
  "puncher-jam",
  "puncher-life-almost-over",
  "puncher-life-over",
  "puncher-memory-exhausted",
  "puncher-missing",
  "puncher-motor-failure",
  "puncher-near-limit",
  "puncher-offline",
  "puncher-opened",
  "puncher-over-temperature",
  "puncher-power-saver",
  "puncher-recoverable-failure",
  "puncher-recoverable-storage-error",
  "puncher-removed",
  "puncher-resource-added",
  "puncher-resource-removed",
  "puncher-thermistor-failure",
  "puncher-timing-failure",
  "puncher-turned-off",
  "puncher-turned-on",
  "puncher-under-temperature",
  "puncher-unrecoverable-failure",
  "puncher-unrecoverable-storage-error",
  "puncher-warming-up",
  "separation-cutter-added",
  "separation-cutter-almost-empty",
  "separation-cutter-almost-full",
  "separation-cutter-at-limit",
  "separation-cutter-closed",
  "separation-cutter-configuration-change",
  "separation-cutter-cover-closed",
  "separation-cutter-cover-open",
  "separation-cutter-empty",
  "separation-cutter-full",
  "separation-cutter-interlock-closed",
  "separation-cutter-interlock-open",
  "separation-cutter-jam",
  "separation-cutter-life-almost-over",
  "separation-cutter-life-over",
  "separation-cutter-memory-exhausted",
  "separation-cutter-missing",
  "separation-cutter-motor-failure",
  "separation-cutter-near-limit",
  "separation-cutter-offline",
  "separation-cutter-opened",
  "separation-cutter-over-temperature",
  "separation-cutter-power-saver",
  "separation-cutter-recoverable-failure",
  "separation-cutter-recoverable-storage-error",
  "separation-cutter-removed",
  "separation-cutter-resource-added",
  "separation-cutter-resource-removed",
  "separation-cutter-thermistor-failure",
  "separation-cutter-timing-failure",
  "separation-cutter-turned-off",
  "separation-cutter-turned-on",
  "separation-cutter-under-temperature",
  "separation-cutter-unrecoverable-failure",
  "separation-cutter-unrecoverable-storage-error",
  "separation-cutter-warming-up",
  "sheet-rotator-added",
  "sheet-rotator-almost-empty",
  "sheet-rotator-almost-full",
  "sheet-rotator-at-limit",
  "sheet-rotator-closed",
  "sheet-rotator-configuration-change",
  "sheet-rotator-cover-closed",
  "sheet-rotator-cover-open",
  "sheet-rotator-empty",
  "sheet-rotator-full",
  "sheet-rotator-interlock-closed",
  "sheet-rotator-interlock-open",
  "sheet-rotator-jam",
  "sheet-rotator-life-almost-over",
  "sheet-rotator-life-over",
  "sheet-rotator-memory-exhausted",
  "sheet-rotator-missing",
  "sheet-rotator-motor-failure",
  "sheet-rotator-near-limit",
  "sheet-rotator-offline",
  "sheet-rotator-opened",
  "sheet-rotator-over-temperature",
  "sheet-rotator-power-saver",
  "sheet-rotator-recoverable-failure",
  "sheet-rotator-recoverable-storage-error",
  "sheet-rotator-removed",
  "sheet-rotator-resource-added",
  "sheet-rotator-resource-removed",
  "sheet-rotator-thermistor-failure",
  "sheet-rotator-timing-failure",
  "sheet-rotator-turned-off",
  "sheet-rotator-turned-on",
  "sheet-rotator-under-temperature",
  "sheet-rotator-unrecoverable-failure",
  "sheet-rotator-unrecoverable-storage-error",
  "sheet-rotator-warming-up",
  "shutdown",
  "slitter-added",
  "slitter-almost-empty",
  "slitter-almost-full",
  "slitter-at-limit",
  "slitter-closed",
  "slitter-configuration-change",
  "slitter-cover-closed",
  "slitter-cover-open",
  "slitter-empty",
  "slitter-full",
  "slitter-interlock-closed",
  "slitter-interlock-open",
  "slitter-jam",
  "slitter-life-almost-over",
  "slitter-life-over",
  "slitter-memory-exhausted",
  "slitter-missing",
  "slitter-motor-failure",
  "slitter-near-limit",
  "slitter-offline",
  "slitter-opened",
  "slitter-over-temperature",
  "slitter-power-saver",
  "slitter-recoverable-failure",
  "slitter-recoverable-storage-error",
  "slitter-removed",
  "slitter-resource-added",
  "slitter-resource-removed",
  "slitter-thermistor-failure",
  "slitter-timing-failure",
  "slitter-turned-off",
  "slitter-turned-on",
  "slitter-under-temperature",
  "slitter-unrecoverable-failure",
  "slitter-unrecoverable-storage-error",
  "slitter-warming-up",
  "spool-area-full",
  "stacker-added",
  "stacker-almost-empty",
  "stacker-almost-full",
  "stacker-at-limit",
  "stacker-closed",
  "stacker-configuration-change",
  "stacker-cover-closed",
  "stacker-cover-open",
  "stacker-empty",
  "stacker-full",
  "stacker-interlock-closed",
  "stacker-interlock-open",
  "stacker-jam",
  "stacker-life-almost-over",
  "stacker-life-over",
  "stacker-memory-exhausted",
  "stacker-missing",
  "stacker-motor-failure",
  "stacker-near-limit",
  "stacker-offline",
  "stacker-opened",
  "stacker-over-temperature",
  "stacker-power-saver",
  "stacker-recoverable-failure",
  "stacker-recoverable-storage-error",
  "stacker-removed",
  "stacker-resource-added",
  "stacker-resource-removed",
  "stacker-thermistor-failure",
  "stacker-timing-failure",
  "stacker-turned-off",
  "stacker-turned-on",
  "stacker-under-temperature",
  "stacker-unrecoverable-failure",
  "stacker-unrecoverable-storage-error",
  "stacker-warming-up",
  "stapler-added",
  "stapler-almost-empty",
  "stapler-almost-full",
  "stapler-at-limit",
  "stapler-closed",
  "stapler-configuration-change",
  "stapler-cover-closed",
  "stapler-cover-open",
  "stapler-empty",
  "stapler-full",
  "stapler-interlock-closed",
  "stapler-interlock-open",
  "stapler-jam",
  "stapler-life-almost-over",
  "stapler-life-over",
  "stapler-memory-exhausted",
  "stapler-missing",
  "stapler-motor-failure",
  "stapler-near-limit",
  "stapler-offline",
  "stapler-opened",
  "stapler-over-temperature",
  "stapler-power-saver",
  "stapler-recoverable-failure",
  "stapler-recoverable-storage-error",
  "stapler-removed",
  "stapler-resource-added",
  "stapler-resource-removed",
  "stapler-thermistor-failure",
  "stapler-timing-failure",
  "stapler-turned-off",
  "stapler-turned-on",
  "stapler-under-temperature",
  "stapler-unrecoverable-failure",
  "stapler-unrecoverable-storage-error",
  "stapler-warming-up",
  "stitcher-added",
  "stitcher-almost-empty",
  "stitcher-almost-full",
  "stitcher-at-limit",
  "stitcher-closed",
  "stitcher-configuration-change",
  "stitcher-cover-closed",
  "stitcher-cover-open",
  "stitcher-empty",
  "stitcher-full",
  "stitcher-interlock-closed",
  "stitcher-interlock-open",
  "stitcher-jam",
  "stitcher-life-almost-over",
  "stitcher-life-over",
  "stitcher-memory-exhausted",
  "stitcher-missing",
  "stitcher-motor-failure",
  "stitcher-near-limit",
  "stitcher-offline",
  "stitcher-opened",
  "stitcher-over-temperature",
  "stitcher-power-saver",
  "stitcher-recoverable-failure",
  "stitcher-recoverable-storage-error",
  "stitcher-removed",
  "stitcher-resource-added",
  "stitcher-resource-removed",
  "stitcher-thermistor-failure",
  "stitcher-timing-failure",
  "stitcher-turned-off",
  "stitcher-turned-on",
  "stitcher-under-temperature",
  "stitcher-unrecoverable-failure",
  "stitcher-unrecoverable-storage-error",
  "stitcher-warming-up",
  "stopped-partly",
  "stopping",
  "subunit-added",
  "subunit-almost-empty",
  "subunit-almost-full",
  "subunit-at-limit",
  "subunit-closed",
  "subunit-empty",
  "subunit-full",
  "subunit-life-almost-over",
  "subunit-life-over",
  "subunit-memory-exhausted",
  "subunit-missing",
  "subunit-motor-failure",
  "subunit-near-limit",
  "subunit-offline",
  "subunit-opened",
  "subunit-over-temperature",
  "subunit-power-saver",
  "subunit-recoverable-failure",
  "subunit-recoverable-storage-error",
  "subunit-removed",
  "subunit-resource-added",
  "subunit-resource-removed",
  "subunit-thermistor-failure",
  "subunit-timing-Failure",
  "subunit-turned-off",
  "subunit-turned-on",
  "subunit-under-temperature",
  "subunit-unrecoverable-failure",
  "subunit-unrecoverable-storage-error",
  "subunit-warming-up",
  "timed-out",
  "toner-empty",
  "toner-low",
  "trimmer-added",
  "trimmer-added",
  "trimmer-almost-empty",
  "trimmer-almost-empty",
  "trimmer-almost-full",
  "trimmer-almost-full",
  "trimmer-at-limit",
  "trimmer-at-limit",
  "trimmer-closed",
  "trimmer-closed",
  "trimmer-configuration-change",
  "trimmer-configuration-change",
  "trimmer-cover-closed",
  "trimmer-cover-closed",
  "trimmer-cover-open",
  "trimmer-cover-open",
  "trimmer-empty",
  "trimmer-empty",
  "trimmer-full",
  "trimmer-full",
  "trimmer-interlock-closed",
  "trimmer-interlock-closed",
  "trimmer-interlock-open",
  "trimmer-interlock-open",
  "trimmer-jam",
  "trimmer-jam",
  "trimmer-life-almost-over",
  "trimmer-life-almost-over",
  "trimmer-life-over",
  "trimmer-life-over",
  "trimmer-memory-exhausted",
  "trimmer-memory-exhausted",
  "trimmer-missing",
  "trimmer-missing",
  "trimmer-motor-failure",
  "trimmer-motor-failure",
  "trimmer-near-limit",
  "trimmer-near-limit",
  "trimmer-offline",
  "trimmer-offline",
  "trimmer-opened",
  "trimmer-opened",
  "trimmer-over-temperature",
  "trimmer-over-temperature",
  "trimmer-power-saver",
  "trimmer-power-saver",
  "trimmer-recoverable-failure",
  "trimmer-recoverable-failure",
  "trimmer-recoverable-storage-error",
  "trimmer-removed",
  "trimmer-resource-added",
  "trimmer-resource-removed",
  "trimmer-thermistor-failure",
  "trimmer-timing-failure",
  "trimmer-turned-off",
  "trimmer-turned-on",
  "trimmer-under-temperature",
  "trimmer-unrecoverable-failure",
  "trimmer-unrecoverable-storage-error",
  "trimmer-warming-up",
  "unknown",
  "wrapper-added",
  "wrapper-almost-empty",
  "wrapper-almost-full",
  "wrapper-at-limit",
  "wrapper-closed",
  "wrapper-configuration-change",
  "wrapper-cover-closed",
  "wrapper-cover-open",
  "wrapper-empty",
  "wrapper-full",
  "wrapper-interlock-closed",
  "wrapper-interlock-open",
  "wrapper-jam",
  "wrapper-life-almost-over",
  "wrapper-life-over",
  "wrapper-memory-exhausted",
  "wrapper-missing",
  "wrapper-motor-failure",
  "wrapper-near-limit",
  "wrapper-offline",
  "wrapper-opened",
  "wrapper-over-temperature",
  "wrapper-power-saver",
  "wrapper-recoverable-failure",
  "wrapper-recoverable-storage-error",
  "wrapper-removed",
  "wrapper-resource-added",
  "wrapper-resource-removed",
  "wrapper-thermistor-failure",
  "wrapper-timing-failure",
  "wrapper-turned-off",
  "wrapper-turned-on",
  "wrapper-under-temperature",
  "wrapper-unrecoverable-failure",
  "wrapper-unrecoverable-storage-error",
  "wrapper-warming-up"
]);
keywords["proof-print-supported"] = setof_keyword([
  "media",
  "media-col",
  "proof-print-copies"
]);
keywords["pwg-raster-document-sheet-back"] = keyword([
  "flipped",
  "manual-tumble",
  "normal",
  "rotated"
]);
keywords["pwg-raster-document-type-supported"] = setof_keyword([
  "adobe-rgb_8",
  "adobe-rgb_16",
  "black_1",
  "black_8",
  "black_16",
  "cmyk_8",
  "cmyk_16",
  "device1_8",
  "device1_16",
  "device2_8",
  "device2_16",
  "device3_8",
  "device3_16",
  "device4_8",
  "device4_16",
  "device5_8",
  "device5_16",
  "device6_8",
  "device6_16",
  "device7_8",
  "device7_16",
  "device8_8",
  "device8_16",
  "device9_8",
  "device9_16",
  "device10_8",
  "device10_16",
  "device11_8",
  "device11_16",
  "device12_8",
  "device12_16",
  "device13_8",
  "device13_16",
  "device14_8",
  "device14_16",
  "device15_8",
  "device15_16",
  "rgb_8",
  "rgb_16",
  "sgray_1",
  "sgray_8",
  "sgray_16",
  "srgb_8",
  "srgb_16"
]);
keywords["requested-attributes"] = keyword([
  "all",
  "document-description",
  "document-template",
  "job-description",
  "job-template",
  "printer-description",
  "subscription-description",
  "subscription-template"
]);
keywords["save-disposition"] = keyword([
  "none",
  "print-save",
  "save-only"
]);
keywords["save-disposition-supported"] = setof_keyword(
  keywords["save-disposition"]
);
keywords["save-info-supported"] = setof_keyword([
  "save-document-format",
  "save-location",
  "save-name"
]);
keywords["separator-sheets-type"] = keyword_name([
  "both-sheets",
  "end-sheet",
  "none",
  "slip-sheets",
  "start-sheet"
]);
keywords["separator-sheets-type-supported"] = setof_keyword_name(
  keywords["separator-sheets-type"]
);
keywords["sheet-collate"] = keyword([
  "collated",
  "uncollated"
]);
keywords["sheet-collate-default"] = keyword(
  keywords["sheet-collate"]
);
keywords["sheet-collate-supported"] = setof_keyword(
  keywords["sheet-collate"]
);
keywords["sides"] = keyword([
  "one-sided",
  "two-sided-long-edge",
  "two-sided-short-edge"
]);
keywords["sides-default"] = keyword(
  keywords["sides"]
);
keywords["sides-supported"] = setof_keyword(
  keywords["sides"]
);
keywords["stitching-reference-edge"] = keyword([
  "bottom",
  "left",
  "right",
  "top"
]);
keywords["stitching-reference-edge-supported"] = setof_keyword(
  keywords["stitching-reference-edge"]
);
keywords["stitching-supported"] = setof_keyword([
  "stitching-locations",
  "stitching-offset",
  "stitching-reference-edge"
]);
keywords["uri-authentication-supported"] = setof_keyword([
  "basic",
  "certificate",
  "digest",
  "negotiate",
  "none",
  "requesting-user-name"
]);
keywords["uri-security-supported"] = setof_keyword([
  "none",
  "ssl3",
  "tls"
]);
keywords["which-jobs"] = keyword([
  "aborted",
  "all",
  "canceled",
  "completed",
  "not-completed",
  "pending",
  "pending-held",
  "processing",
  "processing-stopped",
  "proof-print",
  "saved"
]);
keywords["which-jobs-supported"] = setof_keyword(
  keywords["which-jobs"]
);
keywords["x-image-position"] = keyword([
  "center",
  "left",
  "none",
  "right"
]);
keywords["x-image-position-default"] = keyword(
  keywords["x-image-position"]
);
keywords["x-image-position-supported"] = setof_keyword(
  keywords["x-image-position"]
);
keywords["xri-authentication-supported"] = setof_keyword([
  "basic",
  "certificate",
  "digest",
  "none",
  "requesting-user-name"
]);
keywords["xri-security-supported"] = setof_keyword([
  "none",
  "ssl3",
  "tls"
]);
keywords["y-image-position"] = keyword([
  "bottom",
  "center",
  "none",
  "top"
]);
keywords["y-image-position-default"] = keyword(
  keywords["y-image-position"]
);
keywords["y-image-position-supported"] = setof_keyword(
  keywords["y-image-position"]
);

module.exports = keywords;
},{"./attributes":95}],99:[function(require,module,exports){


var enums = require('./enums'),
	operations = enums['operations-supported'],
	statusCodes = require('./status-codes'),
	tags = require('./tags'),
	RS = '\u001e'
;

module.exports = function(buf) {
	var obj = {};
	var position = 0;
	var encoding = 'utf8';
	function read1(){
		return buf[position++];
	}
	function read2(){
		var val = buf.readInt16BE(position, true);
		position+=2;
		return val;
	}
	function read4(){
		var val = buf.readInt32BE(position, true);
		position+=4;
		return val;
	}
	function read(length, enc){
		if(length==0) return '';
		return buf.toString(enc||encoding, position, position+=length);
	}
	function readGroups(){
		var group;
		while(position < buf.length && (group = read1()) !== 0x03){//end-of-attributes-tag
			readGroup(group);
		}
	}
	function readGroup(group){
		var name = tags.lookup[group];
		group={};
		if(obj[name]){
			if(!Array.isArray(obj[name]))
				obj[name] = [obj[name]];
			obj[name].push(group);
		}
		else obj[name] = group;

		while(buf[position] >= 0x0F) {// delimiters are between 0x00 to 0x0F
			readAttr(group);
		}
	}
	function readAttr(group){
		var tag = read1();
		//TODO: find a test for this
		if (tag === 0x7F){//tags.extension
			tag = read4();
		}
		var name = read(read2());
		group[name] = readValues(tag, name)
	}
	function hasAdditionalValue(){
		var current = buf[position];
		return current !== 0x4A //tags.memberAttrName
			&& current !== 0x37 //tags.endCollection
			&& current !== 0x03 //tags.end-of-attributes-tag
			&& buf[position+1] === 0x00 && buf[position+2] === 0x00;
	}
	function readValues(type, name){
		var value = readValue(type, name);
		if(hasAdditionalValue()){
			value = [value];
			do{
				type = read1();
				read2();//empty name
				value.push(readValue(type, name));
			}
			while(hasAdditionalValue())
		}
		return value;
	}
	function readValue(tag, name){
		var length = read2();
		//http://tools.ietf.org/html/rfc2910#section-3.9
		switch (tag) {
			case tags.enum:
				var val = read4();
				return (enums[name] && enums[name].lookup[val]) || val;
			case tags.integer:
				return read4();

			case tags.boolean:
				return !!read1();

			case tags.rangeOfInteger:
				return [read4(), read4()];

			case tags.resolution:
				return [read4(), read4(), read1()===0x03? 'dpi':'dpcm'];

			case tags.dateTime:
				// http://tools.ietf.org/html/rfc1903 page 17
				var date = new Date(read2(), read1(), read1(), read1(), read1(), read1(), read1());
				//silly way to add on the timezone
				return new Date(date.toISOString().substr(0,23).replace('T',',') +','+ String.fromCharCode(read(1)) + read(1) + ':' + read(1));

			case tags.textWithLanguage:
			case tags.nameWithLanguage:
				var lang = read(read2());
				var subval = read(read2());
				return lang+RS+subval;

			case tags.nameWithoutLanguage:
			case tags.textWithoutLanguage:
			case tags.octetString:
			case tags.memberAttrName:
				return read(length);

			case tags.keyword:
			case tags.uri:
			case tags.uriScheme:
			case tags.charset:
			case tags.naturalLanguage:
			case tags.mimeMediaType:
				return read(length, 'ascii');

			case tags.begCollection:
				//the spec says a value could be present- but can be ignored
				read(length);
				return readCollection();

			case tags['no-value']:
			default:
				debugger;
				return module.exports.handleUnknownTag(tag, name, length, read)
		}
	}
	function readCollection(){
		var tag;
		var collection = {};

		while((tag = read1()) !== 0x37){//tags.endCollection
			if(tag !== 0x4A){
				console.log("unexpected:", tags.lookup[tag]);
				return;
			}
			//read nametag name and discard it
			read(read2());
			var name = readValue(0x4A);
			var values = readCollectionItemValue();
			collection[name] = values;
		}
		//Read endCollection name & value and discard it.
		//The spec says that they MAY have contents in the
		// future- so we can't assume they are empty.
		read(read2());
		read(read2());

		return collection;
	}
	function readCollectionItemValue(name){
		var tag = read1();
		//TODO: find a test for this
		if (tag === 0x7F){//tags.extension
			tag = read4();
		}
		//read valuetag name and discard it
		read(read2());

		return readValues(tag, name);
	}

	obj.version = read1() + '.' + read1();
	var bytes2and3 = read2();
	//byte[2] and byte[3] are used to define the 'operation' on
	//requests, but used to hold the statusCode on responses. We
	//can almost detect if it is a req or a res- but sadly, six
	//values overlap. In these cases, the parser will give both and
	//the consumer can ignore (or delete) whichever they don't want.
	if(bytes2and3 >= 0x02 || bytes2and3 <= 0x3D)
		obj.operation = operations.lookup[bytes2and3];

	if(bytes2and3 <= 0x0007 || bytes2and3 >= 0x0400)
		obj.statusCode = statusCodes.lookup[bytes2and3];
	obj.id = read4();
	readGroups();

	if(position<buf.length)
		obj.data = buf.toString(encoding, position);

	return obj;
};
module.exports.handleUnknownTag = 	function log(tag, name, length, read) {
	var value = length? read(length) : undefined;
	console.log("The spec is not clear on how to handle tag " +tag+ ": " +name+ "=" +String(value)+ ". " +
		"Please open a github issue to help find a solution!");
	return value;
};

},{"./enums":96,"./status-codes":103,"./tags":104}],100:[function(require,module,exports){

var request = require('./request'),
	serialize = require('./serializer'),
	extend = require('./ipputil').extend,
	parseurl = require('url').parse
	;

function Printer(url, opts){
	if(!(this instanceof Printer)) return new Printer(url, opts);
	opts = opts || {};
	this.url = typeof url==="string"? parseurl(url) : url;
	this.version = opts.version || '2.0';
	this.uri = opts.uri || 'ipp://' + this.url.host + this.url.path;
	this.charset = opts.charset || 'utf-8';
	this.language = opts.language || 'en-us';
}
Printer.prototype = {
	_message: function(operation, msg){
		if(typeof operation === "undefined") operation = 'Get-Printer-Attributes';

		var base = {
			version: this.version,
			operation: operation,
			id: null,//will get added by serializer if one isn't given
			'operation-attributes-tag': {
				//these are required to be in this order
				'attributes-charset': this.charset,
				'attributes-natural-language': this.language,
				'printer-uri': this.uri
			}
		};
		//these are required to be in this order
		if(msg && msg['operation-attributes-tag']['job-id'])
			base['operation-attributes-tag']['job-id'] = msg['operation-attributes-tag']['job-id'];
		//yes, this gets done in extend()- however, by doing this now, we define the position in the result object.
		else if(msg && msg['operation-attributes-tag']['job-uri'])
			base['operation-attributes-tag']['job-uri'] = msg['operation-attributes-tag']['job-uri'];

		msg = extend(base, msg);
		if(msg['operation-attributes-tag']['job-uri'])
			delete msg['operation-attributes-tag']['printer-uri'];
		return msg;
	},
	execute: function(operation, msg, cb){
		msg = this._message(operation, msg);
		var buf = serialize(msg);
//		console.log(buf.toString('hex'));
//		console.log(JSON.stringify(
//			require('./parser')(buf), null, 2
//		));
		request(this.url, buf, cb);
	}
}

module.exports = Printer;

},{"./ipputil":97,"./request":101,"./serializer":102,"url":55}],101:[function(require,module,exports){
(function (Buffer){(function (){

var http = require('http'),
	https = require('https'),
	url = require('url'),
	parse = require('./parser');

module.exports = function(opts, buffer, cb){
	var streamed = typeof buffer === "function";
	//All IPP requires are POSTs- so we must have some data.
	//  10 is just a number I picked- this probably should have something more meaningful
	if(!Buffer.isBuffer(buffer) || buffer.length<10){
		return cb(new Error("Data required"));
	}
	if(typeof opts === "string")
		opts = url.parse(opts);
	if(!opts.port) opts.port = 631;

	if(!opts.headers) opts.headers = {};
	opts.headers['Content-Type'] = 'application/ipp';
	opts.method = "POST";
	
	if(opts.protocol==="ipp:")
		opts.protocol="http:";

	if(opts.protocol==="ipps:")
		opts.protocol="https:";

	var req = (opts.protocol==="https:" ? https : http).request(opts, function(res){
//		console.log('STATUS: ' + res.statusCode);
//		console.log('HEADERS: ' + JSON.stringify(res.headers));
		switch(res.statusCode){
			case 100:
				if(opts.headers['Expect'] !== '100-Continue' || typeof opts.continue !== "function"){
					cb(new IppResponseError(res.statusCode));
				}
				return console.log("100 Continue");
			case 200:
				return readResponse(res, cb);
			default:
				cb(new IppResponseError(res.statusCode));
				return console.log(res.statusCode, "response");
		}
	});
	req.on('error', function(err) {
		cb(err);
	});
	if(opts.headers['Expect'] === '100-Continue' && typeof opts.continue=== "function"){
		req.on('continue', function() {
			opts.continue(req);
		});
	}
	req.write(buffer);
	req.end();
};
function readResponse(res, cb){
	var chunks = [],length=0;
	res.on('data', function(chunk){
		length+=chunk.length;
		chunks.push(chunk);
	});
	res.on('end', function(){
		var response = parse(Buffer.concat(chunks, length));
		delete response.operation;
		cb(null, response);
	});
}

function IppResponseError(statusCode, message) {
  this.name = 'IppResponseError';
  this.statusCode = statusCode;
  this.message = message || 'Received unexpected response status ' + statusCode + ' from the printer';
  this.stack = (new Error()).stack;
}
IppResponseError.prototype = Object.create(Error.prototype);
IppResponseError.prototype.constructor = IppResponseError;

}).call(this)}).call(this,require("buffer").Buffer)
},{"./parser":99,"buffer":5,"http":34,"https":19,"url":55}],102:[function(require,module,exports){
(function (Buffer){(function (){

var operations = require('./enums')['operations-supported'],
	tags = require('./tags'),
	versions = require('./versions'),
	attributes = require('./attributes'),
	enums = require('./enums'),
	keywords = require('./keywords'),
	statusCodes = require('./status-codes'),
	RS = '\u001e'
;
function random(){
	return +Math.random().toString().substr(-8);
}

module.exports = function serializer(msg){
	var buf = new Buffer(10240);
	var position = 0;
	function write1(val){
		checkBufferSize(1);
		buf.writeUInt8(val, position);
		position+=1;
	}
	function write2(val){
		checkBufferSize(2);
		buf.writeUInt16BE(val, position);
		position+=2;
	}
	function write4(val){
		checkBufferSize(4);
		buf.writeUInt32BE(val, position);
		position+=4;
	}
	function write(str, enc){
		var length = Buffer.byteLength(str);
		write2(length);
		checkBufferSize(length);
		buf.write(str, position, length, enc || "utf8");
		position+=length;
	}
	function checkBufferSize(length){
		if (position + length > buf.length){
			buf = Buffer.concat([buf], 2 * buf.length);
		}
	}
	var special = {'attributes-charset':1, 'attributes-natural-language':2};
	var groupmap = {
		"job-attributes-tag":	               ['Job Template', 'Job Description'],
		'operation-attributes-tag':          'Operation',
		'printer-attributes-tag':            'Printer Description',
		"unsupported-attributes-tag":        '',//??
		"subscription-attributes-tag":       'Subscription Description',
		"event-notification-attributes-tag": 'Event Notifications',
		"resource-attributes-tag":           '',//??
		"document-attributes-tag":           'Document Description'
	};
	function writeGroup(tag){
		var attrs = msg[tag];
		if(!attrs) return;
		var keys = Object.keys(attrs);
		//'attributes-charset' and 'attributes-natural-language' need to come first- so we sort them to the front
		if(tag==tags['operation-attributes-tag'])
			keys = keys.sort(function(a,b){ return (special[a]||3)-(special[b]||3); });
		var groupname = groupmap[tag];
		write1(tags[tag]);
		keys.forEach(function(name){
			attr(groupname, name, attrs);
		});
	}
	function attr(group, name, obj){
		var groupName = Array.isArray(group)
			? group.find( function (grp) { return attributes[grp][name] })
			: group;
		if(!groupName) throw "Unknown attribute: " + name;

		var syntax = attributes[groupName][name];

		if(!syntax) throw "Unknown attribute: " + name;

		var value = obj[name];
		if(!Array.isArray(value))
			value = [value];

		value.forEach(function(value, i){
			//we need to re-evaluate the alternates every time
			var syntax2 = Array.isArray(syntax)? resolveAlternates(syntax, name, value) : syntax;
			var tag = getTag(syntax2, name, value);
			if(tag===tags.enum)
				value = enums[name][value];

			write1(tag);
			if(i==0){
				write(name);
			}
			else {
				write2(0x0000);//empty name
			}

			writeValue(tag, value, syntax2.members);
		});
	}
	function getTag(syntax, name, value){
		var tag = syntax.tag;
		if(!tag){
			var hasRS = !!~value.indexOf(RS);
			tag = tags[syntax.type+(hasRS?'With':'Without')+'Language'];
		}
		return tag;
	}
	function resolveAlternates(array, name, value){
		switch(array.alts){
			case 'keyword,name':
			case 'keyword,name,novalue':
				if(value===null && array.lookup['novalue']) return array.lookup['novalue'];
				return ~keywords[name].indexOf(value)? array.lookup.keyword : array.lookup.name;
			case 'integer,rangeOfInteger':
				return Array.isArray(value)? array.lookup.rangeOfInteger : array.lookup.integer;
			case 'dateTime,novalue':
				return !IsNaN(date.parse(value))? array.lookup.dateTime : array.lookup['novalue'];
			case 'integer,novalue':
				return !IsNaN(value)? array.lookup.integer : array.lookup['novalue'];
			case 'name,novalue':
				return value!==null? array.lookup.name : array.lookup['novalue'];
			case 'novalue,uri':
				return value!==null? array.lookup.uri : array.lookup['novalue'];
			case 'enumeration,unknown':
				return enums[name][value]? array.lookup['enumeration'] : array.lookup.unknown;
			case 'enumeration,novalue':
				return value!==null? array.lookup['enumeration'] : array.lookup['novalue'];
			case 'collection,novalue':
				return value!==null? array.lookup['enumeration'] : array.lookup['novalue'];
			default:
				throw "Unknown atlernates";
		}
	}
	function writeValue(tag, value, submembers){
		switch(tag){
			case tags.enum:
				write2(0x0004);
				return write4(value);
			case tags.integer:
				write2(0x0004);
				return write4(value);

			case tags.boolean:
				write2(0x0001);
				return write1(Number(value));

			case tags.rangeOfInteger:
				write2(0x0008);
				write4(value[0]);
				write4(value[1]);
				return;

			case tags.resolution:
				write2(0x0009);
				write4(value[0]);
				write4(value[1]);
				write1(value[2]==='dpi'? 0x03 : 0x04);
				return;

			case tags.dateTime:
				write2(0x000B);
				write2(value.getFullYear());
				write1(value.getMonth());
				write1(value.getDate());
				write1(value.getHours());
				write1(value.getMinutes());
				write1(value.getSeconds());
				write1(value.getMilliseconds());
				var tz = timezone(value);
				write1(tz[0]);// + or -
				write1(tz[1]);//hours
				write1(tz[2]);//minutes
				return;

			case tags.textWithLanguage:
			case tags.nameWithLanguage:
				write2(parts[0].length);
				write2(parts[0]);
				write2(parts[1].length);
				write2(parts[1]);
				return;

			case tags.nameWithoutLanguage:
			case tags.textWithoutLanguage:
			case tags.octetString:
			case tags.memberAttrName:
				return write(value);

			case tags.keyword:
			case tags.uri:
			case tags.uriScheme:
			case tags.charset:
			case tags.naturalLanguage:
			case tags.mimeMediaType:
				return write(value, 'ascii');

			case tags.begCollection:
				write2(0);//empty value
				return writeCollection(value, submembers);

			case tags["no-value"]:
				//empty value? I can't find where this is defined in any spec.
				return write2(0);

			default:
				debugger;
				console.error(tag, "not handled");
		}
	}
	function writeCollection(value, members){
		Object.keys(value).forEach(function(key){
			var subvalue = value[key];
			var subsyntax = members[key];

			if(Array.isArray(subsyntax))
				subsyntax = resolveAlternates(subsyntax, key, subvalue);

			var tag = getTag(subsyntax, key, subvalue);
			if(tag===tags.enum)
				subvalue = enums[key][subvalue];

			write1(tags.memberAttrName)
			write2(0)//empty name
			writeValue(tags.memberAttrName, key);
			write1(tag)
			write2(0)//empty name
			writeValue(tag, subvalue, subsyntax.members);
		});
		write1(tags.endCollection)
		write2(0)//empty name
		write2(0)//empty value
	}

	write2(versions[msg.version||'2.0']);
	write2(msg.operation? operations[msg.operation] : statusCodes[msg.statusCode]);
	write4(msg.id||random());//request-id

	writeGroup('operation-attributes-tag');
	writeGroup('job-attributes-tag');
	writeGroup('printer-attributes-tag');
	writeGroup('document-attributes-tag');
	//TODO... add the others

	write1(0x03);//end


	if(!msg.data)
		return buf.slice(0, position);

	if(!Buffer.isBuffer(msg.data))
		throw "data must be a Buffer"

	var buf2 = new Buffer(position + msg.data.length);
	buf.copy(buf2, 0, 0, position);
	msg.data.copy(buf2, position, 0);
	return buf2;
};
function timezone(d) {
	var z = d.getTimezoneOffset();
	return [
		z > 0 ? "-" : "+",
		~~(Math.abs(z) / 60),
		Math.abs(z) % 60
	];
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"./attributes":95,"./enums":96,"./keywords":98,"./status-codes":103,"./tags":104,"./versions":105,"buffer":5}],103:[function(require,module,exports){

var xref = require('./ipputil').xref;

var status = [];
/* Success 0x0000 - 0x00FF */
status[0x0000] = 'successful-ok';                                      //http://tools.ietf.org/html/rfc2911#section-13.1.2.1
status[0x0001] = 'successful-ok-ignored-or-substituted-attributes';    //http://tools.ietf.org/html/rfc2911#section-13.1.2.2 & http://tools.ietf.org/html/rfc3995#section-13.5
status[0x0002] = 'successful-ok-conflicting-attributes';               //http://tools.ietf.org/html/rfc2911#section-13.1.2.3
status[0x0003] = 'successful-ok-ignored-subscriptions';                //http://tools.ietf.org/html/rfc3995#section-12.1
status[0x0004] = 'successful-ok-ignored-notifications';                //http://tools.ietf.org/html/draft-ietf-ipp-indp-method-05#section-9.1.1    did not get standardized
status[0x0005] = 'successful-ok-too-many-events';                      //http://tools.ietf.org/html/rfc3995#section-13.4
status[0x0006] = 'successful-ok-but-cancel-subscription';              //http://tools.ietf.org/html/draft-ietf-ipp-indp-method-05#section-9.2.2    did not get standardized
status[0x0007] = 'successful-ok-events-complete';                      //http://tools.ietf.org/html/rfc3996#section-10.1

status[0x0400] = 'client-error-bad-request';                           //http://tools.ietf.org/html/rfc2911#section-13.1.4.1
status[0x0401] = 'client-error-forbidden';                             //http://tools.ietf.org/html/rfc2911#section-13.1.4.2
status[0x0402] = 'client-error-not-authenticated';                     //http://tools.ietf.org/html/rfc2911#section-13.1.4.3
status[0x0403] = 'client-error-not-authorized';                        //http://tools.ietf.org/html/rfc2911#section-13.1.4.4
status[0x0404] = 'client-error-not-possible';                          //http://tools.ietf.org/html/rfc2911#section-13.1.4.5
status[0x0405] = 'client-error-timeout';                               //http://tools.ietf.org/html/rfc2911#section-13.1.4.6
status[0x0406] = 'client-error-not-found';                             //http://tools.ietf.org/html/rfc2911#section-13.1.4.7
status[0x0407] = 'client-error-gone';                                  //http://tools.ietf.org/html/rfc2911#section-13.1.4.8
status[0x0408] = 'client-error-request-entity-too-large';              //http://tools.ietf.org/html/rfc2911#section-13.1.4.9
status[0x0409] = 'client-error-request-value-too-long';                //http://tools.ietf.org/html/rfc2911#section-13.1.4.1
status[0x040A] = 'client-error-document-format-not-supported';         //http://tools.ietf.org/html/rfc2911#section-13.1.4.11
status[0x040B] = 'client-error-attributes-or-values-not-supported';    //http://tools.ietf.org/html/rfc2911#section-13.1.4.12 & http://tools.ietf.org/html/rfc3995#section-13.2
status[0x040C] = 'client-error-uri-scheme-not-supported';              //http://tools.ietf.org/html/rfc2911#section-13.1.4.13 & http://tools.ietf.org/html/rfc3995#section-13.1
status[0x040D] = 'client-error-charset-not-supported';                 //http://tools.ietf.org/html/rfc2911#section-13.1.4.14
status[0x040E] = 'client-error-conflicting-attributes';                //http://tools.ietf.org/html/rfc2911#section-13.1.4.15
status[0x040F] = 'client-error-compression-not-supported';             //http://tools.ietf.org/html/rfc2911#section-13.1.4.16
status[0x0410] = 'client-error-compression-error';                     //http://tools.ietf.org/html/rfc2911#section-13.1.4.17
status[0x0411] = 'client-error-document-format-error';                 //http://tools.ietf.org/html/rfc2911#section-13.1.4.18
status[0x0412] = 'client-error-document-access-error';                 //http://tools.ietf.org/html/rfc2911#section-13.1.4.19
status[0x0413] = 'client-error-attributes-not-settable';               //http://tools.ietf.org/html/rfc3380#section-7.1
status[0x0414] = 'client-error-ignored-all-subscriptions';             //http://tools.ietf.org/html/rfc3995#section-12.2
status[0x0415] = 'client-error-too-many-subscriptions';                //http://tools.ietf.org/html/rfc3995#section-13.2
status[0x0416] = 'client-error-ignored-all-notifications';             //http://tools.ietf.org/html/draft-ietf-ipp-indp-method-06#section-9.1.2    did not get standardized
status[0x0417] = 'client-error-client-print-support-file-not-found';   //http://tools.ietf.org/html/draft-ietf-ipp-install-04#section-10.1         did not get standardized
status[0x0418] = 'client-error-document-password-error';               //ftp://ftp.pwg.org/pub/pwg/ipp/wd/wd-ippjobprinterext3v10-20120420.pdf     did not get standardized
status[0x0419] = 'client-error-document-permission-error';             //ftp://ftp.pwg.org/pub/pwg/ipp/wd/wd-ippjobprinterext3v10-20120420.pdf     did not get standardized
status[0x041A] = 'client-error-document-security-error';               //ftp://ftp.pwg.org/pub/pwg/ipp/wd/wd-ippjobprinterext3v10-20120420.pdf     did not get standardized
status[0x041B] = 'client-error-document-unprintable-error';            //ftp://ftp.pwg.org/pub/pwg/ipp/wd/wd-ippjobprinterext3v10-20120420.pdf     did not get standardized
/* Server error 0x0500 - 0x05FF */
status[0x0500] = 'server-error-internal-error';                        //http://tools.ietf.org/html/rfc2911#section-13.1.5.1
status[0x0501] = 'server-error-operation-not-supported';               //http://tools.ietf.org/html/rfc2911#section-13.1.5.2
status[0x0502] = 'server-error-service-unavailable';                   //http://tools.ietf.org/html/rfc2911#section-13.1.5.3
status[0x0503] = 'server-error-version-not-supported';                 //http://tools.ietf.org/html/rfc2911#section-13.1.5.4
status[0x0504] = 'server-error-device-error';                          //http://tools.ietf.org/html/rfc2911#section-13.1.5.5
status[0x0505] = 'server-error-temporary-error';                       //http://tools.ietf.org/html/rfc2911#section-13.1.5.6
status[0x0506] = 'server-error-not-accepting-jobs';                    //http://tools.ietf.org/html/rfc2911#section-13.1.5.7
status[0x0507] = 'server-error-busy';                                  //http://tools.ietf.org/html/rfc2911#section-13.1.5.8
status[0x0508] = 'server-error-job-canceled';                          //http://tools.ietf.org/html/rfc2911#section-13.1.5.9
status[0x0509] = 'server-error-multiple-document-jobs-not-supported';  //http://tools.ietf.org/html/rfc2911#section-13.1.5.10
status[0x050A] = 'server-error-printer-is-deactivated';                //http://tools.ietf.org/html/rfc3998#section-5.1
status[0x050B] = 'server-error-too-many-jobs';                         //ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobext10-20031031-5100.7.pdf
status[0x050C] = 'server-error-too-many-documents';                    //ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippjobext10-20031031-5100.7.pdf

module.exports = xref(status);

},{"./ipputil":97}],104:[function(require,module,exports){

var xref = require('./ipputil').xref;

//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-7
//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-8
//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-9
var tags = [
  ,                                     // 0x00 http://tools.ietf.org/html/rfc2910#section-3.5.1
  "operation-attributes-tag",           // 0x01 http://tools.ietf.org/html/rfc2910#section-3.5.1
  "job-attributes-tag",                 // 0x02 http://tools.ietf.org/html/rfc2910#section-3.5.1
  "end-of-attributes-tag",              // 0x03 http://tools.ietf.org/html/rfc2910#section-3.5.1
  "printer-attributes-tag",             // 0x04 http://tools.ietf.org/html/rfc2910#section-3.5.1
  "unsupported-attributes-tag",         // 0x05 http://tools.ietf.org/html/rfc2910#section-3.5.1
  "subscription-attributes-tag",        // 0x06 http://tools.ietf.org/html/rfc3995#section-14
  "event-notification-attributes-tag",  // 0x07 http://tools.ietf.org/html/rfc3995#section-14
  "resource-attributes-tag",            // 0x08 http://tools.ietf.org/html/draft-ietf-ipp-get-resource-00#section-11    did not get standardized
  "document-attributes-tag",            // 0x09 ftp://ftp.pwg.org/pub/pwg/candidates/cs-ippdocobject10-20031031-5100.5.pdf
  ,,,,,,                                // 0x0A - 0x0F
  "unsupported",                        // 0x10 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "default",                            // 0x11 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "unknown",                            // 0x12 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "no-value",                           // 0x13 http://tools.ietf.org/html/rfc2910#section-3.5.2
  ,                                     // 0x14
  "not-settable",                       // 0x15 http://tools.ietf.org/html/rfc3380#section-8.1
  "delete-attribute",                   // 0x16 http://tools.ietf.org/html/rfc3380#section-8.2
  "admin-define",                       // 0x17 http://tools.ietf.org/html/rfc3380#section-8.3
  ,,,,,,,,,                             // 0x18 - 0x20
  "integer",                            // 0x21 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "boolean",                            // 0x22 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "enum",                               // 0x23 http://tools.ietf.org/html/rfc2910#section-3.5.2
  ,,,,,,,,,,,,                          // 0x24 - 0x2F
  "octetString",                        // 0x30 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "dateTime",                           // 0x31 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "resolution",                         // 0x32 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "rangeOfInteger",                     // 0x33 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "begCollection",                      // 0x34 http://tools.ietf.org/html/rfc3382#section-7.1
  "textWithLanguage",                   // 0x35 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "nameWithLanguage",                   // 0x36 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "endCollection",                      // 0x37 http://tools.ietf.org/html/rfc3382#section-7.1
  ,,,,,,,,,                             // 0x38 - 0x40
  "textWithoutLanguage",                // 0x41 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "nameWithoutLanguage",                // 0x42 http://tools.ietf.org/html/rfc2910#section-3.5.2
  ,                                     // 0x43
  "keyword",                            // 0x44 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "uri",                                // 0x45 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "uriScheme",                          // 0x46 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "charset",                            // 0x47 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "naturalLanguage",                    // 0x48 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "mimeMediaType",                      // 0x49 http://tools.ietf.org/html/rfc2910#section-3.5.2
  "memberAttrName"                      // 0x4A http://tools.ietf.org/html/rfc3382#section-7.1
];
tags[0x7F] = "extension";  // http://tools.ietf.org/html/rfc2910#section-3.5.2
module.exports = xref(tags);

},{"./ipputil":97}],105:[function(require,module,exports){

var versions = [];
versions[0x0100] = '1.0';
versions[0x0101] = '1.1';
versions[0x0200] = '2.0';
versions[0x0201] = '2.1';

module.exports = require('./ipputil').xref(versions);

},{"./ipputil":97}]},{},[63]);
