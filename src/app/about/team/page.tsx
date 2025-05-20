import React from 'react'
import Link from 'next/link'
import nextImg from '../../../../public/next.svg'
import globeImg from '../../../../public/globe.svg'
import Image from 'next/image'


function page() {
  return (
    <div>
      
      <h3>Our Team</h3>
      <Image src={nextImg} width={300} height={100} alt='next img' />
      <Image src={globeImg} width={300} height={100} alt='globe img' />
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Officiis id sapiente repudiandae odio officia vel nihil. Ad provident in aspernatur.</p>
      <Link href="/about" className='inline-block bg-purple-500 text-white py-2 px-4 rounded'>Back</Link>
    </div>
  )
}

export default page
