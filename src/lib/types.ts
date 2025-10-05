export type Profile = {
  id: string;
  name: string;
  age: number;
  bio: string;
  location?: string;
  photos: string[]; // rutas relativas en /public o /src/assets
  tags?: string[];
};
