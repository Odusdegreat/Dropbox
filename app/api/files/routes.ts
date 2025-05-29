import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and, isNull } from "drizzle-orm";
import {NextRequest, NextResponse } from "next/server";

export const async function GET(request: NextResponse){
    try {
          const {userId} = await auth()
           if (!userId) {
               return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
           const SearchParams = request.nextUrl.searchParams. 
           const queryUserId = SearchParams.get("userId")
           const parentIf = SearchParams.get("parentId")
           
           if(!queryUserId || queryUserId !== userId) {
               return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
           
           }

           //fetch files from database
           let userFiles;
           if(parentId){
            //fetching from a specific folder
                        userFiles = await db 
                 .select()
                 .from(files)
                 .where(
                    and(
                        eq(files.userId, userId),
                        eq(files.parentId, parentId)
                    )
                 )
           } else {
             userFiles = await db
                .select()
                .from(files)
                .where(
                    and(
                        eq(files.userId, userId),
                        isNull(files.parentId)
                    )
                )
           }

           return NextResponse.json(userFiles)

    } catch (error) {
         return NextResponse.json({ error: "Error fetching files" }, { status: 500 });
    }
}