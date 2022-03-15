include("CalGeneral.js")
include("PrintStatus.js")

cs_t_remote1 = [];
cs_t_remote_ext = [];
cs_time = [];

function CSM_Pos(Distance)
{
	dev.w(64, Distance)
	dev.c(101)
	do
	{
		if(anykey())
			return
		sleep(100)
	}
	while(dev.r(96) == 6)
	
	if(dev.r(96) != 3)
	{
		print("Bad status")
		PrintStatus()
	}
}
function CSM_PosAdap (DeviceCase)

{
	dev.w(71,DeviceCase);
	dev.c(110);
	sleep(1000);
	dev.c(102);
	do
	{
		if(anykey())
			return
		sleep(100)
	}
	while(dev.r(96) == 7)
	
	if(dev.r(96) != 8)
	{
		print("Bad status")
		PrintStatus()
	}
}

function CSM_UNClamp ()

{

	dev.c(120);
	sleep(1000);
	dev.c(109);
	sleep(100);

}
//-----------------------------------------------------------------------------

function CS_CollectTempFunc(Address)

{
	var t_remote1;

	dev.w(84, Address);
	dev.c(115);
	t_remote1 = (dev.r(101) / 10).toFixed(1);
	
	print("Tremote1,  C: " + t_remote1);
	
	cs_t_remote1[cs_time.length] = t_remote1;
	

}

function CS_CollectTempExtFunc(AddressExt)

{
	var t_remote_ext;
	
	dev.w(84, AddressExt);
	dev.c(114);
	t_remote_ext = (dev.r(103) / 10).toFixed(1);
	
	print("TremoteExt, C: " + t_remote_ext);
	cs_t_remote_ext[cs_time.length] = t_remote_ext;
	
	return t_remote_ext;

}

function CS_CollectTimeFunc()
{
	// get time
	var d = new Date();
	var t_stamp = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
	
	print("#" + (cs_time.length + 1));
	print("Time,    sec: " + t_stamp);
	cs_time.push(t_stamp);

}
function CS_Temp(Sleep, Temp)
{
	csm_csv_array = [];
	
	var i = 0;
	var today = new Date();	

	//---------------------------------------

	CSS_TempStart(Temp)

	//---------------------------------------
	print("Reset data arrays? (press 'y' or 'n')");
	var key;
	do
	{
		key = readkey();
	}
	while (key != "y" && key != "n");
	if (key == "y")	
	{
		CS_ResetA();
		print("Data arrays were reseted.");
		print("-----");
	}
	else
	{
		print("Data arrays were NOT reseted.");
		print("-----");
	}
	//---------------------------------------
	
	csm_csv_array.push("Time in sec ; Tremote1, C; TremoteExt, C");

	while(!anykey())
	{
		CS_CollectTempFunc(1);
		CS_CollectTempExtFunc(3);
		CS_CollectTimeFunc();
		print("-----");
		dev.w(84, 1);

		sleep(Sleep);
		
		csm_csv_array.push(i * Sleep / 1000 + ";" + cs_t_remote1[i] + ";" + cs_t_remote_ext[i]);

		i++;
	}
	//---------------------------------------

	plot2s(cs_t_remote1, cs_t_remote_ext, 10, 0);
	save("data/CSM_TempTest.csv", csm_csv_array);

	//---------------------------------------
}

function CS_ResetA()

{

	cs_t_remote1 = [];
	cs_t_remote_ext = [];
	cs_time = [];
	
}

function CCS_TempPlot()

{
	plot(cs_t_remote1, 10, 0);
	plot(cs_t_remote_ext, 10, 0);
	plot2s(cs_t_remote1, cs_t_remote_ext, 10, 0);

}

function CSS_TempStart(Temp)
{

	dev.w(84,1);
	dev.w(72,Temp);
	dev.c(108);

}

