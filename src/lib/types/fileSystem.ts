export interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
}

export interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile: () => Promise<File>;
    createWritable: () => Promise<FileSystemWritableFileStream>;
}

export interface FileSystemWritableFileStream extends WritableStream {
    write: (content: string) => Promise<void>;
    close: () => Promise<void>;
} 