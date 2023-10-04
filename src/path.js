const argsCountPerCommand = {
   Z: 0, 	z: 0,
   H: 1, 	h: 1,
   V: 1, 	v: 1,
   M: 2, 	m: 2,
   L: 2, 	l: 2,
   T: 2, 	t: 2,
   Q: 4, 	q: 4,
   S: 4, 	s: 4,
   C: 6, 	c: 6,
   A: 7, 	a: 7,
}

const isCommand = (c) => {
	return c in argsCountPerCommand;
};

const isWsp = (c) => {
	const codePoint = c.codePointAt(0);
	return (
		codePoint === 0x20 ||
		codePoint === 0x9 ||
		codePoint === 0xd ||
		codePoint === 0xa
	);
};

const isDigit = (c) => {
	const codePoint = c.codePointAt(0);
	if (codePoint == null) {
		return false;
	}
	return 48 <= codePoint && codePoint <= 57;
};

const readNumber = (string, cursor) => {
	let i = cursor;
	let value = '';
	let state = 'none';
	for (; i < string.length; i += 1) {
		const c = string[i];
		if (c === '+' || c === '-') {
			if (state === 'none') {
				state = 'sign';
				value += c;
				continue;
			}
			if (state === 'e') {
				state = 'exponent_sign';
				value += c;
				continue;
			}
		}
		if (isDigit(c)) {
			if (state === 'none' || state === 'sign' || state === 'whole') {
				state = 'whole';
				value += c;
				continue;
			}
			if (state === 'decimal_point' || state === 'decimal') {
				state = 'decimal';
				value += c;
				continue;
			}
			if (state === 'e' || state === 'exponent_sign' || state === 'exponent') {
				state = 'exponent';
				value += c;
				continue;
			}
		}
		if (c === '.') {
			if (state === 'none' || state === 'sign' || state === 'whole') {
				state = 'decimal_point';
				value += c;
				continue;
			}
		}
		if (c === 'E' || c == 'e') {
			if (
				state === 'whole' ||
				state === 'decimal_point' ||
				state === 'decimal'
			) {
				state = 'e';
				value += c;
				continue;
			}
		}
		break;
	}
	const number = Number.parseFloat(value);
	if (Number.isNaN(number)) {
		return [cursor, null];
	} else {
		// step back to delegate iteration to parent loop
		return [i - 1, number];
	}
};



const parsePathData = (string) => {

	const pathData = [];

	let command = null;
	let args = /** @type {number[]} */ ([]);
	let argsCount = 0;
	let canHaveComma = false;
	let hadComma = false;
	for (let i = 0; i < string.length; i += 1) {
		const c = string.charAt(i);
		if (isWsp(c)) {
			continue;
		}
		// allow comma only between arguments
		if (canHaveComma && c === ',') {
			if (hadComma) {
				break;
			}
			hadComma = true;
			continue;
		}
		if (isCommand(c)) {
			if (hadComma) {
				return pathData;
			}
			if (command == null) {
				// moveto should be leading command
				if (c !== 'M' && c !== 'm') {
					return pathData;
				}
			} else {
				// stop if previous command arguments are not flushed
				if (args.length !== 0) {
					return pathData;
				}
			}
			command = c;
			args = [];
			argsCount = argsCountPerCommand[command];
			canHaveComma = false;
			// flush command without arguments
			if (argsCount === 0) {
				pathData.push({
					command,
					args
				});
			}
			continue;
		}
		// avoid parsing arguments if no command detected
		if (command == null) {
			return pathData;
		}
		// read next argument
		let newCursor = i;
		let number = null;
		if (command === 'A' || command === 'a') {
			const position = args.length;
			if (position === 0 || position === 1) {
				// allow only positive number without sign as first two arguments
				if (c !== '+' && c !== '-') {
					[newCursor, number] = readNumber(string, i);
				}
			}
			if (position === 2 || position === 5 || position === 6) {
				[newCursor, number] = readNumber(string, i);
			}
			if (position === 3 || position === 4) {
				// read flags
				if (c === '0') {
					number = 0;
				}
				if (c === '1') {
					number = 1;
				}
			}
		} else {
			[newCursor, number] = readNumber(string, i);
		}
		if (number == null) {
			return pathData;
		}
		args.push(number);
		canHaveComma = true;
		hadComma = false;
		i = newCursor;
		// flush arguments when necessary count is reached
		if (args.length === argsCount) {
			pathData.push({
				command,
				args
			});
			// subsequent moveto coordinates are threated as implicit lineto commands
			if (command === 'M') {
				command = 'L';
			}
			if (command === 'm') {
				command = 'l';
			}
			args = [];
		}
	}
	return pathData;
};

const removeLeadingZero = (num) => {
	var strNum = num.toString();

	if (0 < num && num < 1 && strNum.charAt(0) === '0') {
		strNum = strNum.slice(1);
	} else if (-1 < num && num < 0 && strNum.charAt(1) === '0') {
		strNum = strNum.charAt(0) + strNum.slice(2);
	}
	return strNum;
};


const stringifyArgs = (command, args) => {
	let result = '';
	let prev = '';
	for (let i = 0; i < args.length; i += 1) {
		const number = args[i];
		const numberString = removeLeadingZero(number);
		if (i === 0 || numberString.startsWith('-')) {
			// avoid space before first and negative numbers
			result += numberString;
		} else if (prev.includes('.') && numberString.startsWith('.')) {
			// remove space before decimal with zero whole
			// only when the previous number is also decimal
			result += numberString;
		} else {
			result += ` ${numberString}`;
		}
		prev = numberString;
	}
	return result;
};


const stringifyPathData = pathData => {

	let combined = [];
	for (let i = 0; i < pathData.length; i += 1) {
		let {
			command,
			args
		} = pathData[i];
		if (i === 0) {
			command = command === 'm' && 'M' || command
			combined.push({
				command,
				args
			});
		} else {

			const last = combined[combined.length - 1];
			if (i === 1) {
				if (command === 'L') {
					last.command = 'M';
				}
				if (command === 'l') {
					last.command = 'm';
				}
			}
			if (
				(last.command === command &&
					last.command !== 'M' &&
					last.command !== 'm') ||
				(last.command === 'M' && command === 'L') ||
				(last.command === 'm' && command === 'l')
			) {
				last.args = [...last.args, ...args];
			} else {
				combined.push({
					command,
					args
				});
			}
		}
	}
	
	let result = '';
	for (const {
			command,
			args
		}
		of combined) {
		result +=
			command + stringifyArgs(command, args);
	}
	return result;
};

function minify(selection){
	const data = parsePathData(selection)
	return stringifyPathData(data)
}

module.exports = {
	minify
}