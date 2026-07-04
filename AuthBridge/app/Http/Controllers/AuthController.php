<?php

namespace App\Http\Controllers;

use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    private const DEFAULT_CUSTOMER_ROLE_ID = 1;

    public function redirectToGoogle()
    {
        return Socialite::driver('google')
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')
                ->setHttpClient(new \GuzzleHttp\Client(['verify' => false]))
                ->user();

            $email = $googleUser->email ?: ($googleUser->id . '@google.local');
            $user = $this->findOrCreateSocialUser(
                $email,
                $googleUser->name ?: 'Google User',
                $googleUser->avatar
            );

            return $this->redirectToFrontend($user);
        } catch (\Exception $e) {
            return redirect($this->frontendUrl('/login') . '?error=' . urlencode($e->getMessage()));
        }
    }

    public function redirectToFacebook()
    {
        return Socialite::driver('facebook')->redirect();
    }

    public function handleFacebookCallback()
    {
        try {
            $facebookUser = Socialite::driver('facebook')
                ->setHttpClient(new \GuzzleHttp\Client(['verify' => false]))
                ->user();

            $email = $facebookUser->email ?: ($facebookUser->id . '@facebook.local');
            $user = $this->findOrCreateSocialUser(
                $email,
                $facebookUser->name ?: 'Facebook User',
                $facebookUser->avatar
            );

            return $this->redirectToFrontend($user);
        } catch (\Exception $e) {
            return redirect($this->frontendUrl('/login') . '?error=' . urlencode($e->getMessage()));
        }
    }

    private function findOrCreateSocialUser(string $email, string $name, ?string $avatar): User
    {
        $user = User::where('email', $email)->first();

        if ($user) {
            $user->update([
                'full_name' => $name ?: $user->full_name,
                'avatar_url' => $avatar,
                'updated_at' => now(),
            ]);

            return $user;
        }

        return User::create([
            'full_name' => $name,
            'email' => $email,
            'avatar_url' => $avatar,
            'role_id' => self::DEFAULT_CUSTOMER_ROLE_ID,
            'is_active' => true,
            'password_hash' => Hash::make(Str::random(24)),
        ]);
    }

    private function redirectToFrontend(User $user)
    {
        $token = $this->generateJwtToken($user);
        $params = http_build_query([
            'id' => $user->user_id,
            'name' => $user->full_name,
            'email' => $user->email,
            'avatar' => $user->avatar_url,
            'token' => $token,
        ]);

        return redirect($this->frontendUrl('/login-success') . '?' . $params);
    }

    private function generateJwtToken(User $user): string
    {
        $secretKey = env('JWT_SECRET', 'YourSecretKeyForAuthenticationShouldBeLongEnough');
        $expirationMinutes = (int) env('JWT_EXPIRE', 480);
        $roleName = $this->resolveRoleName($user->role_id ?? self::DEFAULT_CUSTOMER_ROLE_ID);

        $payload = [
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name' => $user->email,
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier' => (string) $user->user_id,
            'http://schemas.microsoft.com/ws/2008/06/identity/claims/role' => $roleName,
            'nbf' => time(),
            'exp' => time() + ($expirationMinutes * 60),
            'iat' => time(),
        ];

        return JWT::encode($payload, $secretKey, 'HS256');
    }

    private function resolveRoleName($roleId): string
    {
        try {
            $role = DB::table('roles')->where('role_id', $roleId)->first();
            return $role ? $role->role_name : 'Customer';
        } catch (\Exception $e) {
            return 'Customer';
        }
    }

    private function frontendUrl(string $path): string
    {
        return rtrim(env('FRONTEND_URL', 'http://localhost:3001'), '/') . $path;
    }
}
