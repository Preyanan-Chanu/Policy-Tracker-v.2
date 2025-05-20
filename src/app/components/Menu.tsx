import Image from "next/image";
import Link from "next/link";

const menuItems = [
    {
        title: "MENU",
        items: [
            {
                icon: "/home.png",
                label: "หน้าหลัก",
                href: "/",
            },
            {
                icon: "/announcement.png",
                label: "นโยบาย",
                href: "/",
            },
            {
                icon: "/calendar.png",
                label: "กิจกรรม",
                href: "/",
            },
            {
                icon: "/student.png",
                label: "เกี่ยวกับเรา",
                href: "/",
            },
        ],
    },
    {
        title: "OTHER",
        items: [
            {
                icon: "/profile.png",
                label: "โปรไฟล์",
                href: "/",
            },
            {
                icon: "/setting.png",
                label: "การตั้งค่า",
                href: "/",
            },
            {
                icon: "/logout.png",
                label: "ออกจากระบบ",
                href: "/",
            },
        ],
    },
];

const Menu = () => {
    return (
        <div className="mt-4 text-sm">
            {menuItems.map((i) => (
                <div className="flex flex-col gap-2" key={i.title}>
                    <span className="hidden lg:block text-white font-light my-4">{i.title}</span>
                    {i.items.map((item) => (
                        <Link href={item.href} key={item.label} className="flex items-center justify-center lg:justify-start gap-4 py-2">
                        <Image src={item.icon} alt="" width={20} height={20}/>
                        <span className="hidden lg:block text-white">{item.label}</span>
                        </Link>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default Menu;