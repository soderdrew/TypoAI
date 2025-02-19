<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { databaseService } from '$lib/services/database';
	import type { SharedDocument, CollaboratorProfile } from '$lib/services/database';

	export let isOpen = false;
	export let currentFile: SharedDocument | null = null;
	export let onClose: () => void;

	let collaboratorProfiles: CollaboratorProfile[] = [];
	let isAddingCollaborator = false;
	let addCollaboratorSuccess: string | null = null;
	let removeCollaboratorSuccess: string | null = null;
	let addCollaboratorError: string | null = null;
	let newCollaboratorEmail = '';

	$: if (isOpen && currentFile) {
		loadCollaboratorProfiles();
	}

	const loadCollaboratorProfiles = async () => {
		if (!currentFile) return;
		try {
			collaboratorProfiles = await databaseService.getCollaboratorProfiles(currentFile.collaborators);
		} catch (error) {
			console.error('Error loading collaborator profiles:', error);
			addCollaboratorError = 'Failed to load collaborators';
		}
	};

	async function handleAddCollaborator() {
		if (!currentFile || !$auth.user) return;
		
		try {
			isAddingCollaborator = true;
			addCollaboratorError = null;
			addCollaboratorSuccess = null;
			
			// Use the databaseService to find the user by email
			const userProfile = await databaseService.findUserByEmail(newCollaboratorEmail);
			
			if (!userProfile) {
				throw new Error('User not found');
			}
			
			// Add the user as a collaborator
			await databaseService.addCollaborator(currentFile.$id, userProfile.userId);
			
			// Immediately refresh collaborator profiles
			await loadCollaboratorProfiles();
			
			// Update the current file to reflect the changes
			const updatedFile = await databaseService.getDocument(currentFile.$id);
			currentFile = updatedFile;
			
			// Clear the input and show success message
			newCollaboratorEmail = '';
			addCollaboratorSuccess = 'Collaborator added successfully';
			
			// Clear success message after 3 seconds
			setTimeout(() => {
				addCollaboratorSuccess = null;
			}, 3000);
			
		} catch (error) {
			console.error('Error adding collaborator:', error);
			addCollaboratorError = 'Failed to add collaborator. Make sure the email is correct and the user exists.';
		} finally {
			isAddingCollaborator = false;
		}
	}

	async function handleRemoveCollaborator(collaboratorId: string) {
		if (!currentFile || !$auth.user) return;
		
		if (!confirm('Are you sure you want to remove this collaborator?')) return;
		
		try {
			// Remove the collaborator
			await databaseService.removeCollaborator(currentFile.$id, collaboratorId);
			
			// Show success message
			removeCollaboratorSuccess = 'Collaborator removed successfully';
			
			// Immediately refresh collaborator profiles
			await loadCollaboratorProfiles();
			
			// Update the current file to reflect the changes
			const updatedFile = await databaseService.getDocument(currentFile.$id);
			currentFile = updatedFile;
			
			// Clear success message after 3 seconds
			setTimeout(() => {
				removeCollaboratorSuccess = null;
			}, 3000);
			
		} catch (error) {
			console.error('Error removing collaborator:', error);
			addCollaboratorError = 'Failed to remove collaborator';
		}
	}
</script>

{#if isOpen && currentFile}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="share-modal-title"
	>
		<div 
			class="bg-gray-800 rounded-lg max-w-2xl w-full"
			role="document"
		>
			<div class="flex justify-between items-center p-4 border-b border-gray-700">
				<h2 id="share-modal-title" class="text-lg font-semibold text-gray-100">Share Document</h2>
				<button 
					class="text-gray-400 hover:text-gray-200"
					on:click={onClose}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="p-4">
				<!-- Add Collaborator Form -->
				<div class="mb-6">
					<label for="collaborator-email" class="block text-sm font-medium text-gray-300 mb-2">Add People</label>
					<div class="flex space-x-2">
						<input 
							id="collaborator-email"
							type="email" 
							placeholder="Enter email address"
							bind:value={newCollaboratorEmail}
							class="flex-1 bg-gray-700 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
							on:keydown|stopPropagation
							on:keyup|stopPropagation
							on:keypress|stopPropagation
						/>
						<button
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
							on:click={handleAddCollaborator}
							disabled={!newCollaboratorEmail || isAddingCollaborator}
						>
							{#if isAddingCollaborator}
								<svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
							{/if}
							Add
						</button>
					</div>
					{#if addCollaboratorError}
						<p class="mt-2 text-sm text-red-400">{addCollaboratorError}</p>
					{/if}
					{#if addCollaboratorSuccess}
						<p class="mt-2 text-sm text-green-400 transition-opacity duration-300">{addCollaboratorSuccess}</p>
					{/if}
				</div>

				<!-- Collaborators -->
				<div>
					<div class="flex justify-between items-center mb-2">
						<h3 class="text-sm font-medium text-gray-300">People with access</h3>
						{#if currentFile?.ownerId === $auth.user?.$id}
							<button 
								class="text-sm text-blue-400 hover:text-blue-300"
								on:click={() => {
									// TODO: Add invite functionality
								}}
							>
								+ Add people
							</button>
						{/if}
					</div>
					
					<!-- Owner -->
					<div class="space-y-2">
						<div class="flex items-center justify-between p-2 bg-gray-700 rounded-lg">
							<div class="flex items-center space-x-3">
								<div class="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
									<span class="text-white font-medium">
										{currentFile.ownerId === $auth.user?.$id ? 
											$auth.user.name?.charAt(0).toUpperCase() : 'O'}
									</span>
								</div>
								<div>
									<p class="text-gray-200 font-medium">
										{currentFile.ownerId === $auth.user?.$id ? 
											$auth.user.name : 'Owner'}
									</p>
									<p class="text-sm text-gray-400">Owner</p>
								</div>
							</div>
							{#if currentFile.ownerId === $auth.user?.$id}
								<span class="px-2 py-1 bg-gray-600 text-gray-300 text-sm rounded-lg">You</span>
							{/if}
						</div>

						<!-- Collaborators -->
						{#if currentFile && collaboratorProfiles}
							{#each collaboratorProfiles.filter(profile => profile.id !== currentFile?.ownerId) as profile}
								<div class="flex items-center justify-between p-2 bg-gray-700 rounded-lg">
									<div class="flex items-center space-x-3">
										<div class="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
											<span class="text-white font-medium">{profile.name.charAt(0).toUpperCase()}</span>
										</div>
										<div>
											<p class="text-gray-200 font-medium">{profile.name}</p>
											<p class="text-sm text-gray-400">{profile.email}</p>
										</div>
									</div>
									<div class="flex items-center space-x-2">
										{#if profile.id === $auth.user?.$id}
											<span class="px-2 py-1 bg-gray-600 text-gray-300 text-sm rounded-lg">You</span>
										{/if}
										{#if currentFile?.ownerId === $auth.user?.$id && profile.id !== $auth.user?.$id}
											<button
												class="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
												on:click={() => handleRemoveCollaborator(profile.id)}
												title="Remove collaborator"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
													<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
												</svg>
											</button>
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if removeCollaboratorSuccess}
	<div class="fixed bottom-4 right-4 bg-green-900 text-green-100 px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300">
		{removeCollaboratorSuccess}
	</div>
{/if} 