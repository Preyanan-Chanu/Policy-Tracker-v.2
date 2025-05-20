import Image from "next/image"

const UserCard = ({type}:{type:string}) => {
    return (
        <div className="rounded-2xl odd:bg-[#F0C1E1] even:bg-theme1 p-4 flex-1 min-w-[130px]">
            <div className="flex justify-between items-center">
                <span className="bg-white px-2 py-1 rounded-full">2025/2</span>
                <Image src="/more.png" alt="" width={20} height={20}/>
            </div>
            <h1 className="text-2xl font-semibold my-4">12</h1>
            <h2 className="capitalize text-sm font-medium">{type}</h2>
        </div>
    )
}

export default UserCard