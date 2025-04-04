import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function GET(request) {
  try {
    // Lấy query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Truy vấn danh sách admin từ Supabase
    let query = supabaseAdmin
      .from('users')
      .select('*, roles:roles(name)')
      .eq('roles.name', 'admin');

    // Thêm điều kiện tìm kiếm nếu có
    if (search) {
      query = query.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`
      );
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Error fetching admins:', error);
      return NextResponse.json(
        { error: 'Error fetching admins' },
        { status: 500 }
      );
    }

    // Lấy thêm thông tin settings của admin
    const adminIds = data.map((admin) => admin.id);

    const { data: adminSettings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .in('admin_id', adminIds);

    if (settingsError) {
      console.error('Error fetching admin settings:', settingsError);
      return NextResponse.json(
        { error: 'Error fetching admin settings' },
        { status: 500 }
      );
    }

    // Map settings vào từng admin
    const adminsWithSettings = data.map((admin) => {
      const settings = adminSettings.find((s) => s.admin_id === admin.id) || {};
      return {
        ...admin,
        settings,
      };
    });

    return NextResponse.json(adminsWithSettings);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, email, full_name, password } = body;

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Lấy role_id của admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError || !roleData) {
      return NextResponse.json(
        { error: 'Admin role not found' },
        { status: 404 }
      );
    }

    // Tạo user mới với role admin
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // Thêm thông tin user vào bảng users
    const { data: newAdmin, error: adminError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: userData.user.id,
          username,
          email,
          full_name: full_name || '',
          role_id: roleData.id,
          password_hash: 'managed-by-supabase-auth', // Mật khẩu được quản lý bởi Supabase Auth
        },
      ])
      .select()
      .single();

    if (adminError) {
      // Xóa user đã tạo nếu có lỗi
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);

      return NextResponse.json({ error: adminError.message }, { status: 400 });
    }

    return NextResponse.json(newAdmin, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
