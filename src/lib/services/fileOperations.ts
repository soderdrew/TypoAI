import type { FileSystemFileHandle } from '../types/fileSystem';
import { openFile, saveFile, handleDroppedFile } from '../utilities/fileHandling';
import { openFileOptions, saveFileOptions } from '../constants/fileOptions';

export class FileOperationsService {
    private fileHandle: FileSystemFileHandle | null = null;
    
    async open(): Promise<{ content: string; error: string | null }> {
        try {
            const result = await openFile(openFileOptions);
            this.fileHandle = result.fileHandle;
            return { content: result.content, error: null };
        } catch (error) {
            return { content: "", error: `${error}` };
        }
    }

    async saveAs(content: string): Promise<{ error: string | null }> {
        try {
            const result = await saveFile(content, null, saveFileOptions);
            this.fileHandle = result.fileHandle;
            return { error: null };
        } catch (error) {
            return { error: `${error}` };
        }
    }

    async save(content: string, viewMode: boolean): Promise<{ error: string | null }> {
        if (this.fileHandle && !viewMode) {
            try {
                const result = await saveFile(content, this.fileHandle, saveFileOptions);
                this.fileHandle = result.fileHandle;
                return { error: null };
            } catch (error) {
                const saveAsResult = await this.saveAs(content);
                return saveAsResult;
            }
        } else {
            return this.saveAs(content);
        }
    }

    async handleDrop(e: DragEvent): Promise<{ content: string | null; error: string | null }> {
        try {
            const result = await handleDroppedFile(e);
            if (result.content) {
                this.fileHandle = result.fileHandle;
                return { content: result.content, error: null };
            }
            return { content: null, error: null };
        } catch (error) {
            return { content: null, error: `${error}` };
        }
    }

    getFileHandle(): FileSystemFileHandle | null {
        return this.fileHandle;
    }
} 