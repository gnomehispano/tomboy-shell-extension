EXTENSION_DIR = ~/.local/share/gnome-shell/extensions/Tomboy_Shell_extension@rodrigo.gnome.org
EXTENSION_FILES = \
	extension.js \
	metadata.json \
	stylesheet.css

install:
	mkdir -p $(EXTENSION_DIR)
	cp $(EXTENSION_FILES) $(EXTENSION_DIR)
