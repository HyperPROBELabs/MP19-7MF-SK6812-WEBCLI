#ifndef RESOURCES_H
#define RESOURCES_H

#include <stddef.h>

typedef struct {
    const char *filename;
    const char *mime_type;
    const unsigned char *data;
    size_t size;
} FileResource;

extern const FileResource file_resources[];
extern const int file_resources_count;

int extract_resources(void);

#endif
