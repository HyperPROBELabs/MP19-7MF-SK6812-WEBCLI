.PHONY: all build clean
SHELL=/bin/bash
CC = x86_64-w64-mingw32-gcc
STRIP = x86_64-w64-mingw32-strip
RC = x86_64-w64-mingw32-windres
CFLAGS = -Wall -Wextra -O2 -std=gnu99 -D_GNU_SOURCE -static
LDFLAGS = -lm -lws2_32
TARGET = hpevbsrv.exe

APPRESOURCE = appresource.o
SOURCES = main.c resources.c
OBJECTS = $(SOURCES:.c=.o)

ALL_OBJECTS = $(OBJECTS) $(APPRESOURCE)
all: resources.c $(TARGET)



resources.c: ./web/index.html ./web/styles.css ./web/app.js ./web/favicon.ico
	python3 build_resources.py ./web/ resources.c

appresource.o: appresource.rc icon.ico
	$(RC) appresource.rc -o appresource.o

$(TARGET): $(ALL_OBJECTS)
	$(CC) $(ALL_OBJECTS) -o $@ $(LDFLAGS)
	@echo "[+] Build complete: $@"

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

strip:
	$(STRIP) $(TARGET)

build: all

clean:
	rm -f *.o resources.c *.exe 
	rm -rf /tmp/hpevbsrvwebbuild 2>/dev/null || true
	rm -rf ./Output

.DEFAULT_GOAL := all
