import { convertDocumentToMarkdown } from './convertDocument';
import type { FileSystemFileHandle } from '../types/fileSystem';

export async function openFile(options: FilePickerOptions): Promise<{ content: string, file: File | null, fileHandle: FileSystemFileHandle | null }> {
    try {
        const [fileHandle] = await window.showOpenFilePicker(options);
        const file = await fileHandle.getFile();
        
        // Handle document conversion for supported file types
        if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
            file.type === "text/plain" ||
            file.type === "application/pdf") {
            const content = await convertDocumentToMarkdown(file);
            // Clear fileHandle since we're working with converted content
            return { content, file, fileHandle: null };
        } else {
            const content = await file.text();
            return { content, file, fileHandle };
        }
    } catch (error) {
        console.error("Error during file open/conversion:", error);
        throw new Error(`Error converting file: ${error}`);
    }
}

export async function saveFile(content: string, fileHandle: FileSystemFileHandle | null, saveOptions: FilePickerOptions): Promise<{ file: File, fileHandle: FileSystemFileHandle }> {
    try {
        if (!fileHandle) {
            fileHandle = await window.showSaveFilePicker(saveOptions);
        }
        
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        const file = await fileHandle.getFile();
        return { file, fileHandle };
    } catch (error) {
        console.error("Error saving file:", error);
        throw new Error(`Error saving file: ${error}`);
    }
}

export async function handleDroppedFile(e: DragEvent): Promise<{ content: string, file: File | null, fileHandle: FileSystemFileHandle | null }> {
    const items = e.dataTransfer?.items;
    if (items && items[0]) {
        const item = items[0];
        if (item.kind === "file") {
            // @ts-ignore - not supported by all browsers
            if (item.getAsFileSystemHandle) {
                e.preventDefault();
                try {
                    const handle = await item.getAsFileSystemHandle();
                    // since `item.kind === "file"` it will be a `FileSystemFileHandle`
                    const fileHandle = handle as FileSystemFileHandle;
                    const file = await fileHandle.getFile();
                    
                    // Handle document conversion for supported file types
                    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                        file.type === "text/plain" ||
                        file.type === "application/pdf") {
                        const content = await convertDocumentToMarkdown(file);
                        return { content, file, fileHandle: null };
                    } else {
                        const content = await file.text();
                        return { content, file, fileHandle };
                    }
                } catch (error) {
                    console.error("Error during file drop/conversion:", error);
                    throw new Error(`Error converting file: ${error}`);
                }
            }
        }
    }
    return { content: "", file: null, fileHandle: null };
} 