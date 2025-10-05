import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";

export default function Models() {
  return (
    <div className="mx-auto ">
      <Card className="p-4">
        <h2 className="text-lg font-semibold">Mis modelos</h2>
        <Table>
          <TableCaption>A list of your recent invoices.</TableCaption>
          <TableHeader>
            <TableRow >
              <TableHead className="w-[100px] text-center">Nombre</TableHead>
              <TableHead className="text-center">Algoritmo</TableHead>
              <TableHead className="text-center">Fecha</TableHead>
              <TableHead className="text-center">Exactitud</TableHead>
              <TableHead className="text-center">Estatus</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="text-center">
              <TableCell className="font-medium">INV001</TableCell>
              <TableCell>Random Forest</TableCell>
              <TableCell>18/09/2001</TableCell>
              <TableCell>95%</TableCell>
              <TableCell><Badge variant="default">Analizando</Badge></TableCell>
              <TableCell className="text-center"><Button onClick={() => {alert("Edit INV001")}} className="mr-5">Cargar</Button>
              <Button onClick={() => {alert("Edit INV001")}}>Actualizar</Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Button className="mt-4">Editar</Button>
      </Card>
    </div>
  );
}
