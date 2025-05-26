declare module "page-flip" {
  export interface PageFlip {
    flipNext: () => void;
    flipPrev: () => void;
    // เพิ่ม methods ที่คุณใช้งานได้ตามเอกสาร
  }

  const PageFlipConstructor: {
    new (...args: any[]): PageFlip;
  };

  export default PageFlipConstructor;
}
