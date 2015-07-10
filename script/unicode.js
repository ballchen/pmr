function native2ascii() {
	var character = document.getElementById("characterTa").value.split("");
	var ascii = "";
	for (var i = 0; i < character.length; i++) {
		var code = Number(character[i].charCodeAt(0));
		if (!document.getElementById("ignoreLetter").checked || code > 127) {
			var charAscii = code.toString(16);
			charAscii = new String("0000").substring(charAscii.length, 4) + charAscii;
			ascii += "\\u" + charAscii;
		} else {
			ascii += character[i];
		}
	}
	document.getElementById("asciiTa").value = ascii;
}

function ascii2native() {
	var character = document.getElementById("asciiTa").value.split("\\u");
	var native = character[0];
	for (var i = 1; i < character.length; i++) {
		var code = character[i];
		native += String.fromCharCode(parseInt("0x" + code.substring(0, 4)));
		if (code.length > 4) {
			native += code.substring(4, code.length);
		}
	}
	document.getElementById("characterTa").value = native;
}