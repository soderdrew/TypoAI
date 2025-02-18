<script lang="ts">
    import { auth } from '$lib/stores/auth';
    import { authService } from '$lib/services/appwrite';
    import { databaseService } from '$lib/services/database';

    let isLogin = true;
    let email = '';
    let password = '';
    let name = '';
    let error = '';
    let loading = false;

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async () => {
        error = '';
        
        // Basic validation
        if (!email || !password || (!isLogin && !name)) {
            error = 'Please fill in all fields';
            return;
        }

        if (!validateEmail(email)) {
            error = 'Please enter a valid email';
            return;
        }

        if (password.length < 8) {
            error = 'Password must be at least 8 characters';
            return;
        }

        loading = true;
        try {
            if (isLogin) {
                await authService.login(email, password);
            } else {
                // Create the account first
                await authService.createAccount(email, password, name);
                
                // Then login
                await authService.login(email, password);
                
                // Get the user details
                const currentUser = await authService.getCurrentUser();
                
                // Create user profile
                if (currentUser) {
                    await databaseService.createProfile(currentUser.$id, name, email);
                }
            }
        } catch (err: any) {
            console.error('Authentication error:', err);
            // Check for specific error messages
            if (err?.message?.includes('already exists')) {
                error = 'An account with this email already exists. Please try logging in instead.';
            } else if (err?.message?.includes('Invalid credentials')) {
                error = 'Invalid email or password.';
            } else if (err?.message?.includes('Password must be')) {
                error = err.message;
            } else {
                error = 'Authentication failed. Please try again.';
            }
        } finally {
            loading = false;
        }
    };

    const useLocal = () => {
        auth.setLocal(true);
    };
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-950 text-gray-50">
    <div class="w-full max-w-md space-y-8 rounded-lg bg-gray-900 p-8">
        <div class="text-center">
            <h2 class="text-3xl font-bold">
                {isLogin ? 'Sign in to TypoAI' : 'Create an account'}
            </h2>
            <p class="mt-2 text-gray-400">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                    class="text-teal-500 hover:text-teal-400"
                    on:click={() => (isLogin = !isLogin)}
                >
                    {isLogin ? 'Sign up' : 'Sign in'}
                </button>
            </p>
        </div>

        <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
            {#if !isLogin}
                <div>
                    <label for="name" class="block text-sm font-medium">Name</label>
                    <input
                        id="name"
                        type="text"
                        bind:value={name}
                        required
                        class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white focus:border-teal-500 focus:ring-teal-500"
                    />
                </div>
            {/if}

            <div>
                <label for="email" class="block text-sm font-medium">Email address</label>
                <input
                    id="email"
                    type="email"
                    bind:value={email}
                    required
                    class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white focus:border-teal-500 focus:ring-teal-500"
                />
            </div>

            <div>
                <label for="password" class="block text-sm font-medium">Password</label>
                <input
                    id="password"
                    type="password"
                    bind:value={password}
                    required
                    class="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white focus:border-teal-500 focus:ring-teal-500"
                />
            </div>

            {#if error}
                <div class="text-sm text-red-500">{error}</div>
            {/if}

            <div class="flex flex-col gap-4">
                <button
                    type="submit"
                    disabled={loading}
                    class="button w-full bg-teal-600 py-3 text-white hover:bg-teal-500 disabled:bg-gray-600"
                >
                    {#if loading}
                        Loading...
                    {:else}
                        {isLogin ? 'Sign in' : 'Create account'}
                    {/if}
                </button>

                <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                        <div class="w-full border-t border-gray-700" />
                    </div>
                    <div class="relative flex justify-center text-sm">
                        <span class="bg-gray-900 px-2 text-gray-400">Or</span>
                    </div>
                </div>

                <button
                    type="button"
                    on:click={useLocal}
                    class="button w-full border border-gray-700 py-3 text-white hover:bg-gray-800"
                >
                    Continue as guest
                </button>
            </div>
        </form>
    </div>
</div> 