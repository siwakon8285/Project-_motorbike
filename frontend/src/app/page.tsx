import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold text-primary-600 mb-8">MotoService Pro</h1>
      <p className="text-xl text-gray-600 mb-8">ยินดีต้อนรับสู่ระบบจัดการศูนย์ซ่อม</p>
      <Link 
        href="/login" 
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
      >
        เข้าสู่ระบบ
      </Link>
    </div>
  );
}
