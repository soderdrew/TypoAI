export const openFileOptions: FilePickerOptions = {
    types: [
        {
            description: "markdown and documents",
            accept: {
                "text/markdown": [".md", ".mdx", ".mdoc", ".markdoc", ".svx"],
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                "application/pdf": [".pdf"],
                "text/plain": [".txt"]
            },
        },
    ],
    excludeAcceptAllOption: true,
};

export const saveFileOptions: FilePickerOptions = {
    types: [
        {
            description: "markdown",
            accept: {
                "text/markdown": [".md"]
            },
        },
    ],
    excludeAcceptAllOption: true,
}; 