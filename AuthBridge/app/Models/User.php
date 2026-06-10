<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    public $incrementing = true;

    protected $fillable = [
        'full_name',
        'email',
        'password_hash',
        'avatar_url',
        'role_id',
        'is_active',
        'created_at',
        'updated_at',
    ];

    protected $hidden = ['password_hash', 'remember_token'];

    /**
     * Chỉ định cột mật khẩu thực tế trong DB.
     */
    public function getAuthPasswordName()
    {
        return 'password_hash';
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
